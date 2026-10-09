import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet";
import { useDispatch, useSelector } from "react-redux";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Calculator as CalculatorIcon, CircleHelp, Clock, Expand, Eye, GraduationCap, Grid3x3, LogOut,
  Moon, ChevronLeft, ChevronRight, BookOpen, Users, Sun, Flag, RefreshCw, ShieldAlert } from "lucide-react";
import { RoleLogin } from "../../../../components/auth/RoleLogin";
import { Button } from "../../../../components/shared/ui/actions/Button";
import { getCbtSettings, loginCbt, logoutCbt } from "../../../../endpoints/cbt/api";
import { useServerCountdown } from "../../../../helpers/useServerCountdown";
import { useCbtAnswerQueue } from "../../../../helpers/useCbtAnswerQueue";
import { useCbtLiveSignal } from "../../../../helpers/useCbtLiveSignal";
import { localStore } from "../../../../helpers/localStore";
import { useExamSecurity, requestExamFullscreen } from "../../../../components/shared/examination/security/useExamSecurity";
import { ExamSecurityOverlay, ExamSecurityIndicator } from "../../../../components/shared/examination/security/ExamSecurityUI";

import { getCbtCandidate, startCbtCandidate, sendCbtAnswers, submitCbt, cbtFetch } from "../../../../endpoints/cbt/api";
import * as CandidateAction from "../../../../store/redux/cbt_candidate_reducer";
import "./cbt-examination.css";

function timeLabel(ms) {
  if (ms == null) return "00:00";
  const t = Math.ceil(ms / 1000);
  return `${String(Math.floor(t / 3600)).padStart(2, "0")}:${String(Math.floor(t % 3600 / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}
function Calculator() {
  const [display, setDisplay] = useState("");
  const tap = value => {
    if (value === "C") return setDisplay("");
    if (value === "←") return setDisplay(s => s.slice(0, -1));
    if (value !== "=") return setDisplay(s => `${s}${value}`.slice(0, 70));
    // Small four-function parser. Never execute exam text with eval/Function.
    try {
      const parts = display.replace(/\s+/g, "").match(/(?:\d+(?:\.\d*)?|\.\d+)|[+*/-]/g);
      if (!parts || parts.join("") !== display.replace(/\s+/g, "")) throw Error();
      const nums = [], ops = [];
      let expectNumber = true;
      for (const p of parts) {
        if (expectNumber && /^[\d.]/.test(p)) { nums.push(Number(p)); expectNumber = false; }
        else if (!expectNumber && /^[+*/-]$/.test(p)) { ops.push(p); expectNumber = true; }
        else throw Error();
      }
      if (expectNumber) throw Error();
      for (let i = 0; i < ops.length;) {
        if (ops[i] === "*" || ops[i] === "/") {
          nums.splice(i, 2, ops[i] === "*" ? nums[i] * nums[i + 1] : nums[i] / nums[i + 1]);
          ops.splice(i, 1);
        } else i++;
      }
      const result = ops.reduce((acc, op, i) => op === "+" ? acc + nums[i + 1] : acc - nums[i + 1], nums[0]);
      setDisplay(Number.isFinite(result) ? String(Number(result.toPrecision(12))) : "Error");
    } catch { setDisplay("Error"); }
  };
  return <div className="calculator-calcu">
    <div className="display-calcu" aria-live="polite">{display || "0"}</div>
    <div className="buttons-calcu">{["C", "/", "*", "←", "7", "8", "9", "-", "4", "5", "6", "+", "1", "2", "3", "0", ".", "="].map(b =>
      <button key={b} type="button" className={`btn-calcu ${"C/*←-+=".includes(b) ? "operator-calcu" : ""}`} onClick={() => tap(b)}>{b}</button>)}</div>
  </div>;
}

export default function CbtCandidate() {
  const dispatch = useDispatch();
  const { isAuthenticated, activeCandidate, sessionToken } = useSelector(s => s.cbtCandidateFunction);
  const { data: loginSettings } = useQuery({ queryKey: ["cbtPublicSettings"], queryFn: getCbtSettings });
  const token = isAuthenticated ? sessionToken : null;
  const signedIn = session => dispatch(CandidateAction.startCandidateAction({ candidateData: { name: session.name }, sessionToken: session.token }));
  const signOutLocal = useCallback(() => dispatch(CandidateAction.logOutCandidate()), [dispatch]);
  if (!token) return <><Helmet><title>CBT — Candidate sign in</title></Helmet><RoleLogin role="candidate" settings={loginSettings} onSignedIn={signedIn} login={loginCbt} backTo="/cbt"/></>;
  return <CbtCandidateExam token={token} name={activeCandidate?.name} signOutLocal={signOutLocal}/>;
}

function CbtCandidateExam({ token, name, signOutLocal }) {
  const qc = useQueryClient();
  const [starting, setStarting] = useState(false);
  const [submitBusy, setSubmitBusy] = useState(false);
  const [confirmStart, setConfirmStart] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [subjectId, setSubjectId] = useState("");
  const [questionIndices, setQuestionIndices] = useState({});
  const [answers, setAnswers] = useState({});
  const [flags, setFlags] = useState({});
  const [aside, setAside] = useState("instruction");
  const [modal, setModal] = useState("");
  const [pagination, setPagination] = useState(true);
  const [night, setNight] = useState(false);
  const [syncError, setSyncError] = useState("");
  const autoStarted = useRef(false);
  const cacheKey = `cbt.cache.exam.${token}`;
  const query = useQuery({
    queryKey: ["cbtCandidate", token],
    queryFn: async () => {
      const data = await getCbtCandidate(token);
      localStore.set(cacheKey, { data, cachedAt: Date.now() });
      return data;
    },
    initialData: () => {
      const cached = localStore.get(cacheKey, null);
      if (!cached) return undefined;
      const elapsed = Date.now() - (cached.cachedAt || Date.now());
      return { ...cached.data, settings: { ...cached.data.settings,
        serverNow: new Date(new Date(cached.data.settings.serverNow).getTime() + elapsed).toISOString() } };
    },
    initialDataUpdatedAt: 0,
    retry: (n, e) => e.status !== 401 && n < 2,
  });
  useCbtLiveSignal(["cbtCandidate", token], ["settings", "content"]);
  useEffect(() => { if (query.error?.status === 401) { toast.error("Session ended. Please sign in again."); signOutLocal(); } }, [query.error, signOutLocal]);
  const data = query.data;
  const examId = data?.settings?.examId;
  const candidateId = data?.candidate?.id;
  const answersKey = examId && candidateId ? `cbt.answers.${candidateId}.${examId}` : null;
  const flagsKey = examId && candidateId ? `cbt.flags.${candidateId}.${examId}` : null;
  const queueKey = examId && candidateId ? `cbt.queue.${candidateId}.${examId}` : null;
  const securityKey = examId && candidateId ? `cbt.security.${candidateId}.${examId}` : null;
  const send = useCallback(items => sendCbtAnswers(token, { examId, answers: items.map(({ questionId, selectedOption, at }) => ({ questionId, selectedOption, at })) }), [token, examId]);
  const queue = useCbtAnswerQueue(queueKey, send, err => { setSyncError(err.message); toast.error(`Answer sync failed: ${err.message}`); });
  useEffect(() => {
    if (!answersKey || !data) return;
    setAnswers({ ...data.answers, ...localStore.get(answersKey, {}) });
    setFlags(localStore.get(flagsKey, {}));
  }, [answersKey, flagsKey, data?.answers, data?.attempt?.status]);
  useEffect(() => { if (data?.subjects?.length && !data.subjects.some(s => s.id === subjectId)) setSubjectId(data.subjects[0].id); }, [data?.subjects, subjectId]);
  const attemptEnd = data?.attempt?.endsAt ? new Date(data.attempt.endsAt).getTime() : null;
  const globalEnd = data?.settings?.endsAt ? new Date(data.settings.endsAt).getTime() : null;
  const effectiveEnd = attemptEnd != null && globalEnd != null ? new Date(Math.min(attemptEnd, globalEnd)) : data?.attempt?.endsAt || null;
  const remaining = useServerCountdown(effectiveEnd, data?.settings?.serverNow);
  const ended = !!data?.attempt && ["submitted", "time_up"].includes(data.attempt.status);
  const timeUp = remaining !== null && remaining <= 0;
  const canAnswer = data?.settings?.candidateAccessOpen !== false && data?.attempt?.status === "in_progress" && !timeUp && !submitBusy;
  const subjects = data?.subjects || [];
  const questions = useMemo(() => (data?.questions || []).filter(q => q.subjectId === subjectId), [data?.questions, subjectId]);
  const safeIndex = Math.max(0, Math.min(questionIndices[subjectId] || 0, questions.length - 1));
  const current = questions[safeIndex];
  const totalAnswered = (data?.questions || []).filter(q => !!answers[q.id]).length;
  const unanswered = (data?.questions || []).length - totalAnswered;
  const offsetRef = useRef(0);
  const stampRef = useRef(null);
  const lastAnswerAtRef = useRef(0);
  if (data?.settings?.serverNow && data.settings.serverNow !== stampRef.current) {
    stampRef.current = data.settings.serverNow;
    offsetRef.current = new Date(data.settings.serverNow).getTime() - Date.now();
  }
  const answer = useCallback((qid, selectedOption) => {
    if (!canAnswer || !document.fullscreenElement || localStore.get(securityKey, {}).locked) return;
    const next = { ...answers, [qid]: selectedOption };
    setAnswers(next);
    if (answersKey) localStore.set(answersKey, next);
    // A timestamp from the server-clock estimate for reconnection ordering.
    const at = Math.max(Date.now() + offsetRef.current, lastAnswerAtRef.current + 1);
    lastAnswerAtRef.current = at;
    queue.enqueue({ questionId: qid, selectedOption, at });
  }, [answers, answersKey, canAnswer, queue, securityKey]);
  const toggleFlag = () => {
    if (!current) return;
    const f = { ...flags, [current.id]: !flags[current.id] };
    setFlags(f);
    if (flagsKey) localStore.set(flagsKey, f);
  };
  const move = useCallback(index => setQuestionIndices(prev => ({ ...prev, [subjectId]: Math.max(0, Math.min(questions.length - 1, index)) })), [subjectId, questions.length]);
  const start = async () => {
    // Browser fullscreen must be requested directly in this Start click.
    if (!(await requestExamFullscreen())) {
      toast.error("Please enter fullscreen before starting the examination.");
      return;
    }
    setStarting(true);
    try {
      const result = await startCbtCandidate(token);
      qc.setQueryData(["cbtCandidate", token], result);
      localStore.set(cacheKey, { data: result, cachedAt: Date.now() });
      setConfirmStart(false);
      autoStarted.current = false;
    } catch (e) { toast.error(e.message); }
    finally { setStarting(false); }
  };
  const finish = useCallback(async auto => {
    if (submitBusy || !examId) return;
    setSubmitBusy(true);
    try {
      const saved = await queue.flush();
      if (!saved) { toast.error("Answers are still pending synchronization. Reconnect before submitting."); return; }
      const result = await submitCbt(token, { examId, auto });
      qc.setQueryData(["cbtCandidate", token], result);
      setConfirmSubmit(false);
      toast.success("CBT examination submitted.");
    } catch (e) { toast.error(e.message); }
    finally { setSubmitBusy(false); }
  }, [submitBusy, examId, queue, token, qc]);
  const reportSecurity = useCallback(event => cbtFetch("candidate/security-event", {
    token, method: "POST", body: { ...event, examinationType: "CBT" },
  }), [token]);
  const security = useExamSecurity({
    context: { examId },
    enabled: data?.attempt?.status === "in_progress" && data?.settings?.candidateAccessOpen !== false && !timeUp,
    storageKey: securityKey,
    onLimitReached: () => void finish(true),
    reportIncident: reportSecurity,
    serverSecurity: data?.security,
    retryTermination: true,
  });
  useEffect(() => {
    if (!timeUp || data?.attempt?.status === "submitted" || autoStarted.current) return;
    autoStarted.current = true;
    void finish(true);
  }, [timeUp, data?.attempt?.status, finish]);
  // If the connection was lost at the deadline, try again on reconnect.
  useEffect(() => {
    if (!timeUp || data?.attempt?.status === "submitted") return undefined;
    const retry = () => { autoStarted.current = false; void finish(true); };
    window.addEventListener("online", retry);
    return () => window.removeEventListener("online", retry);
  }, [timeUp, data?.attempt?.status, finish]);
  useEffect(() => { if (!timeUp) autoStarted.current = false; }, [timeUp]);
  useEffect(() => {
    if (!canAnswer || !security.isFullscreen || security.locked || !current) return undefined;
    const key = event => {
      if (event.metaKey || event.ctrlKey || event.altKey || ["INPUT", "TEXTAREA"].includes(event.target?.tagName) || modal || confirmSubmit) return;
      const letter = event.key.toUpperCase();
      if (current.options.some(o => o.letter === letter)) answer(current.id, letter);
      if (event.key === "ArrowRight") move(safeIndex + 1);
      if (event.key === "ArrowLeft") move(safeIndex - 1);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [canAnswer, security.isFullscreen, security.locked, current, safeIndex, modal, confirmSubmit, answer, move]);
  // The original button now restores fullscreen; clicking it can no longer
  // deliberately exit fullscreen and trigger a malpractice warning.
  const toggleFullscreen = () => void security.enterFullscreen();
  const signOut = async () => {
    if (queue.pending) { toast.error("Wait for pending answers to sync before signing out."); return; }
    try { await logoutCbt(token); } catch {}
    signOutLocal();
  };
  // A security-locked candidate must be able to release this shared device.
  // Keep candidate-scoped pending answers and incident records for invigilator recovery.
  const signOutAfterLock = () => {
    localStore.remove(cacheKey);
    signOutLocal();
    qc.removeQueries({ queryKey: ["cbtCandidate", token], exact: true });
    if (document.fullscreenElement && document.exitFullscreen) {
      void document.exitFullscreen().catch(() => {});
    }
    // Do not keep the sign-in screen waiting if the network is unavailable.
    void logoutCbt(token).catch(() => {});
  };
  if (!data) return <div className="cbtExamScope cbtWaiting"><Helmet><title>CBT</title></Helmet><p>{query.error?.message || "Loading examination…"}</p><Button onClick={() => query.refetch()}>Retry</Button></div>;
  if (security.locked) return <div className="cbtExamScope cbtWaiting">
    <Helmet><title>CBT — Examination security lock</title></Helmet>
    <div className="cbtWaitingCard"><ShieldAlert size={44} color="#b42318"/>
      <h1>Examination locked</h1><p>Three security incidents were recorded. Submission is in progress or waiting for connectivity. Contact your invigilator.</p>
      {queue.pending > 0 && <Button onClick={() => void queue.flush()} disabled={queue.syncing}>Retry answer synchronization</Button>}
    </div>
    <ExamSecurityOverlay security={security} title="CBT examination locked" onSignOut={signOutAfterLock}/>
  </div>;
  if (ended || (!data.attempt?.startedAt) || data.settings.candidateAccessOpen === false) return <div className="cbtExamScope cbtWaiting">
    <Helmet><title>CBT — Examination</title></Helmet>
    <div className="cbtWaitingCard"><GraduationCap size={40} color="#26bf89"/>
      <h1>{data.settings.institutionName}</h1><h2>{data.settings.examTitle}</h2>
      <p>Welcome, <strong>{data.candidate.fullName}</strong> ({data.candidate.examNumber}).</p>
      {data.settings.candidateAccessOpen === false ? <><h2>CBT candidate devices are temporarily closed</h2><p>Wait for the Control Room to open candidate access again. Your saved answers remain stored.</p></> : ended ? <><h2>{data.attempt.status === "submitted" ? "Examination submitted" : "Your examination time has ended"}</h2>
          <p>{queue.pending ? `${queue.pending} answer(s) are waiting to synchronize. Do not close this page.` : "Your examination is closed. Thank you."}</p>
          {queue.pending && <Button onClick={() => void queue.flush()} disabled={queue.syncing}>Retry synchronization</Button>}</>
        : <><p>{data.settings.examStatus === "running" ? "Your examination is ready. There is one CBT sitting containing all assigned subjects." :
          data.settings.examStatus === "not_started" ? "The examination has not yet started. Wait for the control room." : "This examination has ended."}</p>
          {data.canStart && <Button onClick={() => setConfirmStart(true)}>Start examination</Button>}</>}
      <div className="cbtWaitingActions"><Button variant="outline" onClick={() => query.refetch()}>Refresh status</Button><Button variant="ghost" onClick={signOut}><LogOut size={15}/> Sign out</Button></div>
    </div>
    {confirmStart && <div className="cbtModal" onClick={() => setConfirmStart(false)}><div className="cbtDialog" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
      <h2>Start CBT examination?</h2><p>The examination is timed and cannot be paused. Your answers save automatically when you select an option.</p>
      <div className="cbtDialogActions"><Button variant="outline" onClick={() => setConfirmStart(false)}>Not yet</Button><Button disabled={starting} onClick={start}>{starting ? "Starting…" : "Start now"}</Button></div>
    </div></div>}
  </div>;
  return <section className={`cbtExamScope sectionCBTExamsHub exam-secure-content ${night ? "cbtNight" : ""}`}>
    <ExamSecurityOverlay security={security} title="CBT examination security"/>
    <Helmet><title>CBT — {data.settings.examTitle}</title></Helmet>
    <div className="cbtExamsHubCont">
      <header className="ctbExamsHubHeader"><div className="cbtExamsHubheaderCont fx-ac fx-jb space6">
        <figure className="fx-ac space3"><div className="cbtSchoolBadge fx-ac fx-jc"><GraduationCap size={30}/></div>
          <div className="fx-cl"><p className="cbtExamshubHeading"><strong>{data.settings.examTitle}</strong></p>
            <div className="cbtExamshubStatusBar fx-ac spacem"><span>{data.settings.institutionName}</span>
              <span className="fx-ac spacem"><Users size={16}/><strong>CBT Examination</strong></span>
              <span className="fx-ac spacem"><Clock size={16}/>{timeLabel(remaining)}</span>
              <ExamSecurityIndicator security={security}/>
            </div></div></figure>
        <figure className="ctbExamsHubRight fx-ac space2"><span><strong>{data.candidate.fullName}</strong> · {data.candidate.examNumber}</span>
          <div className="cbtdp fx-ac fx-jc">{data.candidate.fullName?.slice(0, 1)}</div></figure>
      </div></header>
      <div className="ctbExamsHubMain space4"><main className="main fx-cl space4">
        {subjects.length > 1 && (
          <nav className="ctbExamsHubSubjects fx-ac space2" aria-label="Subjects">{subjects.map(s =>
            <button key={s.id} className={s.id === subjectId ? "active" : ""} onClick={() => setSubjectId(s.id)}>{s.title}</button>)}</nav>
        )}
        {current ? <div className="ctbExamsHubQuestion fx-cl space2">
          <div className="ctbExamsHubQuestionBtn fx-ac space2">
            <button aria-label="Exam information" onClick={() => setModal("help")} title="Exam information"><CircleHelp size={25}/></button>
            <button aria-label="Preview question" onClick={() => setModal("preview")} title="Preview question"><Eye size={25}/></button>
          </div>
          <div className="ctbExamsHubMiddleWare fx-ac fx-jb space4"><button onClick={() => setModal("timer")} className="fx-ac spacem"><Clock size={20}/>{timeLabel(remaining)}</button>
            <button onClick={() => setModal("calculator")} className="fx-ac spacem" style={{ color: "#26bf89" }}><CalculatorIcon size={20}/> Calculator</button></div>
          <span className="ctbExamsHubQuestionCounts">Question: {safeIndex + 1}/{questions.length}</span>
          <div className="question-body fx-cl space1"><p className={`cbtTheQuestion fx-ac ${current.questionText.length > 400 ? "switchQuestionToScroll" : current.questionText.length > 365 ? "switchQuestionFontSizeMedium" : ""}`}>{current.questionText}</p>
            <div className="exHubOptionCont fx-cl space2" role="radiogroup" aria-label="Answer options">
              {current.options.map(option => <label key={option.letter} className={`optionSelectionEx fx-ac spacem ${answers[current.id] === option.letter ? "checkedExOpt checkEx" : ""}`}>
                {option.label !== "" && <span className="exOptionsType">{option.label ?? option.letter}</span>}<input type="radio" name={`question-${current.id}`} value={option.letter}
                  checked={answers[current.id] === option.letter} disabled={!canAnswer || security.locked || !security.isFullscreen} onChange={() => answer(current.id, option.letter)} />
                <span>{option.text}</span></label>)}</div>
          </div>
        </div> : <div className="cbtBlank">No questions are available in this subject.</div>}
        <div className="ctbExamsHubOperations fx-ac fx-jb space3"><div className="prev"><button className="next-button" disabled={safeIndex <= 0} onClick={() => move(safeIndex - 1)}><ChevronLeft size={18}/> Previous</button></div>
          <figure className="fx-jc fx-ac space1">
            <button title="Night mode" aria-label="Night mode" onClick={() => setNight(v => !v)}>{night ? <Sun size={24}/> : <Moon size={24}/>}</button>
            <button title="Fullscreen" aria-label="Fullscreen" className={security.isFullscreen ? "active" : ""} onClick={toggleFullscreen}><Expand size={24}/></button>
            <button title="Timer" aria-label="Timer" onClick={() => setModal("timer")}><Clock size={24}/></button>
            <button className="submit" onClick={() => setConfirmSubmit(true)}>Submit exams</button>
            <button title="Toggle pagination" aria-label="Toggle pagination" className={pagination ? "active" : ""} onClick={() => setPagination(v => !v)}><Grid3x3 size={24}/></button>
            <button title={flags[current?.id] ? "Remove flag" : "Flag for review"} aria-label="Flag for review" onClick={toggleFlag}><Flag size={23} fill={flags[current?.id] ? "#f85a38" : "none"}/></button>
          </figure>
          <div className="next"><button className="next-button" disabled={safeIndex >= questions.length - 1} onClick={() => move(safeIndex + 1)}>Next <ChevronRight size={18}/></button></div>
        </div>
        {pagination && <nav className="ctbExamsHubPaginations" aria-label="Question pagination"><div className="ctbExamsHubPaginationsCont">
          {questions.map((q, i) => <button key={q.id} type="button" aria-current={i === safeIndex ? "page" : undefined}
            aria-label={`Question ${i + 1}, ${answers[q.id] ? "answered" : "unanswered"}${flags[q.id] ? ", flagged" : ""}`}
            onClick={() => move(i)} className={`pagination-button ${i === safeIndex ? "active" : ""} ${answers[q.id] ? "peginationChecked" : ""} ${flags[q.id] ? "cbtFlagged" : ""}`}>{i + 1}</button>)}</div>
          <div className="cbtLegend">{questions.filter(q => !!answers[q.id]).length}/{questions.length} answered · {questions.length - questions.filter(q => !!answers[q.id]).length} unanswered</div>
        </nav>}
        <div className="cbtSyncState" role="status">{syncError ? <strong>{syncError}</strong> : queue.syncing ? "Synchronizing answers…" : queue.pending ? `${queue.pending} unsynced answer(s)` : "Answers saved"}
          {!queue.online && " · Offline"} {queue.pending > 0 && <button onClick={() => void queue.flush()}><RefreshCw size={14}/> Sync now</button>}</div>
      </main>
      <aside className="aside fx-cl space1"><nav className="ctbExamsHubAsideNav fx-ac spacem">
        <button className={aside === "instruction" ? "active" : ""} onClick={() => setAside("instruction")}>Instructions</button>
        <button className={aside === "regulation" ? "active" : ""} onClick={() => setAside("regulation")}>Regulations</button>
        <button className={aside === "guide" ? "active" : ""} onClick={() => setAside("guide")}>Manual</button></nav>
        <div className="Instructions fx-cl space2"><strong>{aside === "instruction" ? "Examination Instructions" : aside === "regulation" ? "Examination Regulations" : "Computer Based Guide"}</strong>
          {aside === "instruction" ? <p>{data.settings.instructions || "Read every question carefully. Your selection saves automatically."}<br/>{subjects.find(s => s.id === subjectId)?.instructions}</p>
            : aside === "regulation" ? <ol><li>Answer your own examination.</li><li>Do not close the page while answers are pending synchronization.</li><li>Time cannot be paused or restarted.</li></ol>
              : <ol><li>Click an option to save it instantly.</li><li>Use Next, Previous, or the numbered pagination to move freely.</li><li>Blue pagination indicates answered questions; green indicates the current answered question.</li><li>Switch subjects without losing answers.</li></ol>}</div>
        <div className="cbtAsideStatus"><BookOpen size={16}/> {totalAnswered}/{data.questions.length} answered</div>
        <Button variant="outline" size="sm" onClick={signOut} disabled={queue.pending > 0}><LogOut size={14}/> Sign out</Button>
      </aside></div>
      <footer className="ctbExamsHubFooter fx-ac fx-jc">© {new Date().getFullYear()} · {data.settings.institutionName} · CBT Examination</footer>
    </div>
    {(modal || confirmSubmit) && <div className="cbtModal" onClick={() => { setModal(""); setConfirmSubmit(false); }}>
      <div className="cbtDialog" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        {confirmSubmit ? <><h2>Submit your CBT examination?</h2><p>You have <strong>{unanswered} unanswered</strong> question(s) across {subjects.length} subject(s). You cannot return after submission.</p>
          <div className="cbtDialogActions"><Button variant="outline" onClick={() => setConfirmSubmit(false)}>Continue exam</Button><Button disabled={submitBusy} onClick={() => void finish(false)}>{submitBusy ? "Synchronizing…" : "Submit examination"}</Button></div></>
          : modal === "calculator" ? <><h2>Calculator</h2><Calculator/></>
          : modal === "timer" ? <><h2>Time remaining</h2><div className="cbtBigTime">{timeLabel(remaining)}</div><p>Your examination timer cannot be paused.</p></>
          : modal === "preview" ? <><h2>Question preview</h2><p>{current?.questionText}</p>{current?.options.map(o => <p key={o.letter}>{o.label === "" ? "" : `${o.label ?? o.letter}. `}{o.text}</p>)}</>
          : <><h2>Examination information</h2><p>Read the instructions in the sidebar. You can navigate to any question and edit an answer before time runs out.</p></>}
        {!confirmSubmit && <Button variant="outline" onClick={() => setModal("")}>Close</Button>}
      </div>
    </div>}
  </section>;
}
