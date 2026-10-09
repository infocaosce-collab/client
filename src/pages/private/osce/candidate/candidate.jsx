import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet";
import { useDispatch, useSelector } from "react-redux";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Flag, LogOut, CheckCircle2, Hourglass, Clock, ListChecks, Lock } from "lucide-react";
import { Button } from "../../../../components/shared/ui/actions/Button";
import { Badge } from "../../../../components/shared/ui/feedback/Badge";
import { Skeleton } from "../../../../components/shared/ui/feedback/Skeleton";
import { Spinner } from "../../../../components/shared/ui/feedback/Spinner";
import { ExamHeader, ExamTimer } from "../../../../components/shared/examination/ExamHeader";
import { SyncStatus } from "../../../../components/shared/ui/feedback/SyncStatus";
import { RoleLogin } from "../../../../components/auth/RoleLogin";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, } from "../../../../components/shared/ui/overlays/Dialog";
import { getCandidateExam, } from "../../../../endpoints/candidate/exam_GET.schema";
import { postCandidateAnswer } from "../../../../endpoints/candidate/answer_POST.schema";
import { postCandidateStation } from "../../../../endpoints/candidate/station_POST.schema";
import { postLogout } from "../../../../endpoints/auth/logout_POST.schema";
import { usePublicSettings } from "../../../../helpers/usePublicSettings";
import { useLiveSignal } from "../../../../helpers/useLiveSignal";
import { useExamClock } from "../../../../helpers/useExamClock";
import { useServerCountdown } from "../../../../helpers/useServerCountdown";
import { usePersistentQueue } from "../../../../helpers/usePersistentQueue";
import { localStore } from "../../../../helpers/localStore";
import { apiFetch } from "../../../../helpers/apiFetch";
import { useExamSecurity, requestExamFullscreen } from "../../../../components/shared/examination/security/useExamSecurity";
import { ExamSecurityOverlay, ExamSecurityIndicator } from "../../../../components/shared/examination/security/ExamSecurityUI";
import * as CandidateAction from "../../../../store/redux/candidate_reducer.js";
import styles from "./candidate.module.css";
const EXAM_CACHE = "osce.cache.candidateExam";
export default function CandidatePage() {
    const dispatch = useDispatch();
    const { isAuthenticated, activeCandidate, sessionToken } = useSelector((state) => state.candidateFunction);
    const { data: settings } = usePublicSettings();
    const session = isAuthenticated && sessionToken
        ? { token: sessionToken, name: activeCandidate?.name || "" }
        : null;
    const setSession = (signedSession) => {
        if (!signedSession) {
            dispatch(CandidateAction.logOutCandidate());
            return;
        }
        dispatch(CandidateAction.startCandidateAction({
            candidateData: { name: signedSession.name },
            sessionToken: signedSession.token,
        }));
    };
    if (!session) {
        return (<>
        <Helmet>
          <title>Candidate sign in</title>
        </Helmet>
        <RoleLogin role="candidate" settings={settings} onSignedIn={setSession}/>
      </>);
    }
    return <CandidateExam session={session} onSignOut={() => setSession(null)}/>;
}
function CandidateExam({ session, onSignOut }) {
    const token = session.token;
    const qc = useQueryClient();
    const { data: liveSettings } = usePublicSettings();
    // Candidates only react to control-room changes — never to other people's marks or answers.
    useLiveSignal([["candidateExam", token]], ["settings", "content", "candidates"]);
    const examQuery = useQuery({
        queryKey: ["candidateExam", token],
        queryFn: async () => {
            const d = await getCandidateExam(token);
            // Keep the paper on the device so a reload during a network drop still works.
            localStore.set(EXAM_CACHE, { token, data: d, cachedAt: Date.now() });
            return d;
        },
        initialData: () => {
            const cached = localStore.get(EXAM_CACHE, null);
            if (!cached || cached.token !== token)
                return undefined;
            const elapsed = cached.cachedAt ? Date.now() - cached.cachedAt : 0;
            return {
                ...cached.data,
                settings: {
                    ...cached.data.settings,
                    serverNow: new Date(new Date(cached.data.settings.serverNow).getTime() + elapsed),
                },
            };
        },
        initialDataUpdatedAt: 0,
        retry: (count, err) => err.status !== 401 && count < 2,
    });
    useEffect(() => {
        if (examQuery.error?.status === 401) {
            toast.error("Your session ended. Please sign in again.");
            onSignOut();
        }
    }, [examQuery.error, onSignOut]);
    const data = examQuery.data;
    const settings = liveSettings ?? data?.settings;
    const globalClock = useExamClock(settings);
    const candidateId = data?.candidate.id ?? null;
    // Server-clock offset, so an answer made offline carries the true time it was given.
    const offsetRef = useRef(0);
    const lastServerNow = useRef(null);
    if (settings?.serverNow) {
        const sn = new Date(settings.serverNow).getTime();
        if (lastServerNow.current !== sn) {
            lastServerNow.current = sn;
            offsetRef.current = sn - Date.now();
        }
    }
    // ---- local answers (device-first), synced through the persistent queue ----
    const sitting = settings?.startedAt ? new Date(settings.startedAt).getTime() : "none";
    const answersKey = candidateId ? `osce.answers.${candidateId}.${sitting}` : null;
    const flagsKey = candidateId ? `osce.flags.${candidateId}.${sitting}` : null;
    const [answers, setAnswers] = useState({});
    const [flags, setFlags] = useState({});
    useEffect(() => {
        if (!answersKey || !flagsKey || !data)
            return;
        const local = localStore.get(answersKey, {});
        setAnswers({ ...data.answers, ...local });
        setFlags(localStore.get(flagsKey, {}));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [answersKey, flagsKey, data?.answers]);
    const send = useCallback(async (items) => {
        const first = items[0];
        if (first.type === "submitStation") {
            await postCandidateStation(token, { action: "submit", stationNumber: first.stationNumber, auto: first.auto });
            return 1;
        }
        const batch = [];
        for (const it of items) {
            if (it.type !== "answer")
                break;
            batch.push({ questionId: it.questionId, selectedOption: it.selectedOption, at: it.at });
        }
        await postCandidateAnswer(token, { answers: batch });
        return batch.length;
    }, [token]);
    const queue = usePersistentQueue(candidateId ? `osce.queue.candidate.${candidateId}` : null, send, (item, err) => {
        if (item.type === "answer")
            toast.error(`An answer could not be saved: ${err.message}`);
    }, 
    // Taps within a few seconds travel together in one small request.
    { delayMs: 2500 });
    // Stations submitted on this device but maybe not yet on the server.
    const [localDone, setLocalDone] = useState({});
    const pendingDone = new Set(queue.pendingItems.filter((i) => i.type === "submitStation").map((i) => i.stationNumber));
    const isDone = (s) => s.attempt.status === "submitted" || !!localDone[s.number] || pendingDone.has(s.number);
    const stations = data?.stations ?? [];
    const active = data?.activeStation != null ? stations.find((s) => s.number === data.activeStation && !isDone(s)) : undefined;
    const stationRemaining = useServerCountdown(active?.attempt.endsAt ?? null, settings?.serverNow);
    const submitStation = useCallback((stationNumber, auto) => {
        setLocalDone((d) => ({ ...d, [stationNumber]: true }));
        queue.enqueue({ type: "submitStation", stationNumber, auto }, { immediate: true });
    }, [queue]);
    // Automatic submission when the station's allocated time (or the whole exam) runs out.
    useEffect(() => {
        if (!active)
            return;
        if ((stationRemaining !== null && stationRemaining <= 0) || globalClock.timeUp) {
            toast.info(`Time is up for Station ${active.number}. Your answers have been submitted.`);
            submitStation(active.number, true);
        }
    }, [active, stationRemaining, globalClock.timeUp, submitStation]);
    const [starting, setStarting] = useState(null);
    const [confirmStart, setConfirmStart] = useState(null);
    const startStation = async (s) => {
        // IMPORTANT: requestFullscreen must happen inside this user click, before
        // any network operation or navigation, or the browser may reject it.
        if (!(await requestExamFullscreen())) {
            toast.error("Please activate fullscreen to start or continue this station.");
            setConfirmStart(null);
            return;
        }
        setStarting(s.number);
        try {
            // The paper arrives in the same response — no second download before the candidate can begin.
            const res = await postCandidateStation(token, { action: "start", stationNumber: s.number });
            qc.setQueryData(["candidateExam", token], (old) => {
                if (!old)
                    return old;
                const next = {
                    ...old,
                    settings: { ...old.settings, serverNow: res.serverNow },
                    stations: old.stations.map((st) => (st.number === s.number ? { ...st, attempt: res.attempt } : st)),
                    activeStation: res.attempt.status === "in_progress" ? s.number : old.activeStation,
                    questions: res.questions ?? old.questions,
                    answers: { ...old.answers, ...(res.answers ?? {}) },
                };
                localStore.set(EXAM_CACHE, { token, data: next, cachedAt: Date.now() });
                return next;
            });
        }
        catch (err) {
            toast.error(err.status === 0
                ? "No connection — a station can only be started while online."
                : err.message);
        }
        finally {
            setStarting(null);
            setConfirmStart(null);
        }
    };
    const signOut = async () => {
        try {
            await postLogout(token);
        }
        catch { }
        onSignOut();
    };
    // Release a locked shared device immediately, even when offline.
    // Do not erase offline answers or pending security reports for this candidate.
    const signOutAfterLock = () => {
        localStore.remove(EXAM_CACHE);
        onSignOut();
        qc.removeQueries({ queryKey: ["candidateExam", token], exact: true });
        if (document.fullscreenElement && document.exitFullscreen) {
            void document.exitFullscreen().catch(() => {});
        }
        void postLogout(token).catch(() => {});
    };
    // Violations belong to the candidate's examination sitting, not one station.
    // OSCE station submission remains the existing backend operation; separate
    // server enforcement of the candidate-wide lock is required before proctored use.
    const securityKey = candidateId && sitting !== "none" ? `osce.security.${candidateId}.${sitting}` : null;
    const onSecurityLimit = useCallback(() => {
        if (active) submitStation(active.number, true);
    }, [active, submitStation]);
    const reportSecurity = useCallback(event => apiFetch("candidate/security-event", {
        method: "POST", token, body: {
            ...event, examinationType: "OSCE",
        },
    }), [token]);
    const security = useExamSecurity({
        context: { stationNumber: active?.number ?? null, sitting },
        enabled: !!active && !globalClock.timeUp && !isDone(active),
        storageKey: securityKey,
        onLimitReached: onSecurityLimit,
        reportIncident: reportSecurity,
        serverSecurity: data?.security,
    });
    const stationClock = active && stationRemaining !== null
        ? { status: stationRemaining > 0 ? "running" : "ended", remainingMs: stationRemaining, timeUp: stationRemaining <= 0 }
        : null;
    const header = (<ExamHeader settings={settings} context={data
            ? `${data.candidate.examNumber} · ${data.candidate.fullName}${active ? ` · Station ${active.number}` : ""}`
            : undefined} right={<>
          {active || security.locked ? <ExamSecurityIndicator security={security}/> : null}
          <SyncStatus online={queue.online} pending={queue.pending} syncing={queue.syncing}/>
          {/* Candidates only ever see their own station's allocated time. */}
          {stationClock ? <ExamTimer clock={stationClock}/> : null}
        </>}/>);
    if (!data) {
        return (<div className={styles.page}>
        {header}
        <div className={styles.centerBox}>
          {examQuery.isError ? <p>{examQuery.error.message}</p> : <Skeleton style={{ width: 320, height: 120 }}/>}
        </div>
      </div>);
    }
    if (security.locked) {
        return (<div className={styles.page}>
          <Helmet><title>Examination security lock</title></Helmet>
          {header}
          <div className={styles.centerBox}><div className={styles.notice}>
            <Lock size={40} className={styles.noticeIcon}/>
            <h1>Examination locked</h1>
            <p>Three security incidents were detected on this device. The current station is being submitted. Contact your invigilator.</p>
          </div></div>
          <ExamSecurityOverlay security={security} title="OSCE examination locked" onSignOut={signOutAfterLock}/>
        </div>);
    }
    const attendable = stations.filter((s) => s.questionCount > 0);
    const allDone = attendable.length > 0 && attendable.every(isDone);
    if (settings && !settings.candidateAccessOpen) {
        return (<div className={styles.page}>
        <Helmet>
          <title>Examination closed</title>
        </Helmet>
        {header}
        <div className={styles.centerBox}>
          <div className={styles.notice}>
            <Lock size={40} className={styles.noticeIcon}/>
            <h1>The examination is closed</h1>
            <p>
              The control room has hidden the examination for now. This screen opens automatically when it is made
              available again — please wait for the invigilator.
            </p>
            <Button variant="ghost" onClick={signOut}>
              Not you? Sign out
            </Button>
          </div>
        </div>
      </div>);
    }
    if (allDone || (globalClock.timeUp && !active)) {
        return (<div className={styles.page}>
        <Helmet>
          <title>Submitted</title>
        </Helmet>
        {header}
        <div className={styles.centerBox}>
          <div className={styles.notice}>
            <CheckCircle2 size={40} className={styles.noticeIconOk}/>
            <h1>{allDone ? "All stations submitted" : "The examination has ended"}</h1>
            <p>
              {queue.pending > 0
                ? "Your answers are saved on this device and will be sent as soon as the network is back. Please leave this device switched on."
                : "Thank you. Please remain seated until the invigilator instructs you."}
            </p>
            <Button variant="outline" onClick={signOut}>
              <LogOut size={16}/> Sign out
            </Button>
          </div>
        </div>
      </div>);
    }
    if (active && data.questions.length > 0 && data.questions[0].stationNumber === active.number) {
        return (<div className={`${styles.page} exam-secure-content`}>
        <Helmet>
          <title>{`Station ${active.number} · ${data.candidate.examNumber}`}</title>
        </Helmet>
        {header}
        <ExamSecurityOverlay security={security} title="OSCE examination security"/>
        <CbtPaper key={active.number} data={data} station={active} answers={answers} flags={flags} endLabel={settings?.endButtonLabel ?? "End Exam"} onAnswer={(qid, letter) => {
                if (!security.isFullscreen || security.locked) return;
                const next = { ...answers, [qid]: letter };
                setAnswers(next);
                if (answersKey)
                    localStore.set(answersKey, next);
                queue.enqueue({ type: "answer", questionId: qid, selectedOption: letter, at: Date.now() + offsetRef.current });
            }} onToggleFlag={(qid) => {
                const next = { ...flags, [qid]: !flags[qid] };
                setFlags(next);
                if (flagsKey)
                    localStore.set(flagsKey, next);
            }} onSubmit={() => submitStation(active.number, false)}/>
      </div>);
    }
    // ---- Station picker: the three question stations ----
    const running = globalClock.status === "running";
    return (<div className={styles.page}>
      <Helmet>
        <title>Choose a station</title>
      </Helmet>
      {header}
      <main className={styles.pickerMain}>
        <div className={styles.pickerHead}>
          <h1>Welcome, {data.candidate.fullName}</h1>
          <p>
            {running
            ? "Choose the question station you are attending now. Its timer starts when you open it and your answers are submitted automatically when the time runs out."
            : "The stations will open when the control room starts the examination."}
          </p>
        </div>
        <div className={styles.stationGrid}>
          {stations.map((s) => {
            const done = isDone(s);
            const empty = s.questionCount === 0;
            const inProgress = s.attempt.status === "in_progress" && !done;
            return (<div key={s.number} className={`${styles.stationCard} ${done ? styles.stationCardDone : ""}`}>
                <div className={styles.stationCardTop}>
                  <span className={styles.bigStationNo}>{s.number}</span>
                  {done ? (<Badge variant="success">Submitted</Badge>) : inProgress ? (<Badge variant="warning">In progress</Badge>) : (<Badge variant="outline">Not started</Badge>)}
                </div>
                <div className={styles.stationCardTitle}>{s.title}</div>
                <div className={styles.stationCardMeta}>
                  <span>
                    <ListChecks size={14}/> {s.questionCount} questions
                  </span>
                  <span>
                    <Clock size={14}/> {s.durationMinutes} min
                  </span>
                </div>
                {s.instructions ? <p className={styles.stationCardInstr}>{s.instructions}</p> : null}
                <Button size="lg" className={styles.stationCardBtn} disabled={!running || done || empty || starting !== null} variant={inProgress ? "primary" : done ? "outline" : "primary"} onClick={() => (inProgress ? startStation(s) : setConfirmStart(s))}>
                  {done ? (<>
                      <Lock size={16}/> Completed
                    </>) : starting === s.number ? (<Spinner size="sm"/>) : empty ? ("No questions yet") : inProgress ? ("Continue station") : ("Attend this station")}
                </Button>
              </div>);
        })}
        </div>
        {!running ? (<div className={styles.waitNote}>
            <Hourglass size={18}/> Waiting for the examination to start…
          </div>) : null}
        <Button variant="ghost" onClick={signOut} className={styles.signOutLink}>
          Not you? Sign out
        </Button>
      </main>

      <Dialog open={!!confirmStart} onOpenChange={(o) => !o && setConfirmStart(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start Station {confirmStart?.number}?</DialogTitle>
            <DialogDescription>
              You will have <strong>{confirmStart?.durationMinutes} minutes</strong> for {confirmStart?.questionCount}{" "}
              questions. The timer starts now and cannot be paused. You cannot open another station until this one is
              submitted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmStart(null)}>
              Not yet
            </Button>
            <Button onClick={() => confirmStart && startStation(confirmStart)} disabled={starting !== null}>
              {starting !== null ? <Spinner size="sm"/> : null} Start timer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>);
}
function CbtPaper({ data, station, answers, flags, endLabel, onAnswer, onToggleFlag, onSubmit }) {
    const questions = useMemo(() => data.questions.filter((q) => q.stationNumber === station.number), [data.questions, station.number]);
    const [index, setIndex] = useState(0);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const mainRef = useRef(null);
    const safeIndex = Math.min(index, questions.length - 1);
    const q = questions[safeIndex];
    const answeredCount = questions.filter((qq) => answers[qq.id]).length;
    const unanswered = questions.length - answeredCount;
    const go = useCallback((i) => {
        setIndex(Math.max(0, Math.min(questions.length - 1, i)));
        mainRef.current?.scrollTo({ top: 0 });
    }, [questions.length]);
    useEffect(() => {
        const onKey = (e) => {
            if (!q || confirmOpen || e.metaKey || e.ctrlKey || e.altKey)
                return;
            const t = e.target;
            if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA"))
                return;
            const k = e.key.toUpperCase();
            const opt = q.options.find((o) => o.letter === k);
            if (opt)
                onAnswer(q.id, opt.letter);
            else if (e.key === "ArrowRight" || k === "N")
                go(safeIndex + 1);
            else if (e.key === "ArrowLeft" || k === "P")
                go(safeIndex - 1);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [q, safeIndex, go, onAnswer, confirmOpen]);
    if (!q)
        return null;
    return (<div className={styles.cbt}>
      <main className={styles.main} ref={mainRef}>
        <div className={styles.stationBar}>
          <span className={styles.stationNo}>{station.number}</span>
          <div>
            <div className={styles.stationTitle}>{station.title}</div>
            {station.instructions ? <div className={styles.stationInstr}>{station.instructions}</div> : null}
          </div>
        </div>

        <div className={styles.qMeta}>
          <span>
            Question <strong>{safeIndex + 1}</strong> of {questions.length}
          </span>
          <Button variant={flags[q.id] ? "secondary" : "ghost"} size="sm" onClick={() => onToggleFlag(q.id)} aria-pressed={!!flags[q.id]}>
            <Flag size={14}/> {flags[q.id] ? "Flagged for review" : "Flag for review"}
          </Button>
        </div>

        <div className={styles.questionText}>{q.questionText}</div>

        <div className={styles.options} role="radiogroup" aria-label="Answer options">
          {q.options.map((o) => {
            const selected = answers[q.id] === o.letter;
            return (<button key={o.letter} type="button" role="radio" aria-checked={selected} className={`${styles.option} ${selected ? styles.optionSelected : ""}`} onClick={() => onAnswer(q.id, o.letter)}>
                {o.label !== "" && <span className={styles.optionLetter}>{o.label ?? o.letter}</span>}
                <span className={styles.optionText}>{o.text}</span>
              </button>);
        })}
        </div>

        <div className={styles.navButtons}>
          <Button variant="outline" size="lg" onClick={() => go(safeIndex - 1)} disabled={safeIndex === 0}>
            <ChevronLeft size={18}/> Previous
          </Button>
          <Button size="lg" onClick={() => go(safeIndex + 1)} disabled={safeIndex === questions.length - 1}>
            Next <ChevronRight size={18}/>
          </Button>
        </div>
      </main>

      <aside className={styles.aside} aria-label="Question navigation">
        <div className={styles.asideHead}>
          <span>Station {station.number} navigator</span>
          <span className={styles.mono}>
            {answeredCount}/{questions.length}
          </span>
        </div>
        <div className={styles.groups}>
          <div className={styles.navGrid}>
            {questions.map((qq, i) => (<button key={qq.id} type="button" onClick={() => go(i)} className={[
                styles.navBox,
                answers[qq.id] ? styles.navAnswered : "",
                i === safeIndex ? styles.navCurrent : "",
                flags[qq.id] ? styles.navFlagged : "",
            ].join(" ")} aria-label={`Question ${i + 1}${answers[qq.id] ? ", answered" : ", not answered"}${flags[qq.id] ? ", flagged" : ""}`} aria-current={i === safeIndex}>
                {i + 1}
              </button>))}
          </div>
        </div>
        <div className={styles.legend}>
          <span>
            <i className={`${styles.legendBox} ${styles.navAnswered}`}/> Answered
          </span>
          <span>
            <i className={styles.legendBox}/> Not answered
          </span>
          <span>
            <i className={`${styles.legendBox} ${styles.navFlagged}`}/> Flagged
          </span>
        </div>
        <Button variant="destructive" size="lg" className={styles.endBtn} onClick={() => setConfirmOpen(true)}>
          {endLabel}
        </Button>
      </aside>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {endLabel} — Station {station.number}?
            </DialogTitle>
            <DialogDescription>
              {unanswered > 0
            ? `You have ${unanswered} unanswered question${unanswered === 1 ? "" : "s"}. `
            : "You have answered every question in this station. "}
              Once you submit you cannot return to this station.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Go back
            </Button>
            <Button variant="destructive" onClick={() => {
            setConfirmOpen(false);
            onSubmit();
        }}>
              Submit station
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>);
}
