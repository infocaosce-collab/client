import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet";
import { useDispatch, useSelector } from "react-redux";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Search, LogOut, Eye, ChevronRight, Play, Square, Lock, Check, RefreshCw } from "lucide-react";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { Textarea } from "../components/Textarea";
import { Badge } from "../components/Badge";
import { Skeleton } from "../components/Skeleton";
import { Spinner } from "../components/Spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/Tabs";
import { ExamHeader, ExamTimer, formatDuration } from "../components/ExamHeader";
import { SyncStatus } from "../components/SyncStatus";
import { RoleLogin } from "../components/RoleLogin";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, } from "../components/Dialog";
import { getExaminerData, } from "../endpoints/examiner/data_GET.schema";
import { postExaminerScore } from "../endpoints/examiner/score_POST.schema";
import { postExaminerStation } from "../endpoints/examiner/station_POST.schema";
import { postLogout } from "../endpoints/auth/logout_POST.schema";
import { usePublicSettings } from "../helpers/usePublicSettings";
import { useLiveSignal } from "../helpers/useLiveSignal";
import { useExamClock } from "../helpers/useExamClock";
import { useServerCountdown } from "../helpers/useServerCountdown";
import { usePersistentQueue } from "../helpers/usePersistentQueue";
import { localStore } from "../helpers/localStore";
import * as ExaminerAction from "../store/redux/examiner_reducer.js";
import styles from "./examiner.module.css";
const COMPONENT_LABEL = {
    project: "Project",
    viva: "Viva",
    client_care: "Client care study",
};
const CACHE = "osce.cache.examinerData";
export default function ExaminerPage() {
    const dispatch = useDispatch();
    const { isAuthenticated, activeExaminer, sessionToken } = useSelector((state) => state.examinerFunction);
    const { data: settings } = usePublicSettings();
    const session = isAuthenticated && sessionToken
        ? { token: sessionToken, name: activeExaminer?.name || "" }
        : null;
    const setSession = (signedSession) => {
        if (!signedSession) {
            dispatch(ExaminerAction.logOutExaminer());
            return;
        }
        dispatch(ExaminerAction.startExaminerAction({
            examinerData: { name: signedSession.name },
            sessionToken: signedSession.token,
        }));
    };
    if (!session) {
        return (<>
        <Helmet>
          <title>Examiner sign in</title>
        </Helmet>
        <RoleLogin role="examiner" settings={settings} onSignedIn={setSession}/>
      </>);
    }
    return <ExaminerDesk session={session} onSignOut={() => setSession(null)}/>;
}
/** Merge consecutive score saves for one candidate into a single request. */
function mergeScores(items) {
    const itemMap = new Map();
    const compMap = new Map();
    for (const it of items) {
        for (const s of it.itemScores ?? [])
            itemMap.set(s.checklistItemId, s.score);
        for (const c of it.components ?? [])
            compMap.set(c.component, c);
    }
    return {
        candidateId: items[0].candidateId,
        itemScores: [...itemMap].map(([checklistItemId, score]) => ({ checklistItemId, score })),
        components: [...compMap.values()],
    };
}
function ExaminerDesk({ session, onSignOut }) {
    const token = session.token;
    const qc = useQueryClient();
    const { data: liveSettings } = usePublicSettings();
    // Examiners refresh on control-room changes only — not on every other device's marks.
    useLiveSignal([["examinerData", token]], ["settings", "content", "examiners", "candidates"]);
    const query = useQuery({
        queryKey: ["examinerData", token],
        queryFn: async () => {
            const d = await getExaminerData(token);
            localStore.set(CACHE, { token, data: d, cachedAt: Date.now() });
            return d;
        },
        initialData: () => {
            const c = localStore.get(CACHE, null);
            if (!c || c.token !== token)
                return undefined;
            const elapsed = c.cachedAt ? Date.now() - c.cachedAt : 0;
            return {
                ...c.data,
                settings: { ...c.data.settings, serverNow: new Date(new Date(c.data.settings.serverNow).getTime() + elapsed) },
            };
        },
        initialDataUpdatedAt: 0,
        retry: (n, err) => err.status !== 401 && n < 2,
    });
    useEffect(() => {
        if (query.error?.status === 401) {
            toast.error("Your session ended. Please sign in again.");
            onSignOut();
        }
    }, [query.error, onSignOut]);
    const data = query.data;
    const settings = liveSettings ?? data?.settings;
    const clock = useExamClock(settings);
    const send = useCallback(async (items) => {
        const first = items[0];
        if (first.type === "submit") {
            await postExaminerStation(token, { action: "submit", candidateId: first.candidateId, auto: first.auto });
            return 1;
        }
        const run = [];
        for (const it of items) {
            if (it.type !== "score" || it.input.candidateId !== first.input.candidateId)
                break;
            run.push(it.input);
        }
        await postExaminerScore(token, mergeScores(run));
        return run.length;
    }, [token]);
    const queue = usePersistentQueue(data ? `osce.queue.examiner.v2.${data.examiner.id}` : null, send, (_item, err) => toast.error(`Not saved: ${err.message}`));
    // Submissions made on this device that the server may not know about yet.
    const [localSubmitted, setLocalSubmitted] = useState({});
    const submitQueued = useRef(new Set());
    // Overlay pending saves so the list and sheet reflect them.
    const candidates = useMemo(() => {
        if (!data)
            return [];
        const pending = queue.pendingItems;
        return data.candidates.map((c) => {
            const mine = pending.filter((p) => (p.type === "score" ? p.input.candidateId : p.candidateId) === c.id);
            const next = {
                ...c,
                itemScores: { ...c.itemScores },
                components: { ...c.components },
                attempt: { ...c.attempt },
            };
            for (const p of mine) {
                if (p.type === "submit") {
                    next.attempt = { ...next.attempt, status: "submitted", submittedAt: next.attempt.submittedAt ?? new Date() };
                    continue;
                }
                for (const s of p.input.itemScores ?? []) {
                    if (s.score === null)
                        delete next.itemScores[s.checklistItemId];
                    else
                        next.itemScores[s.checklistItemId] = s.score;
                }
                for (const comp of p.input.components ?? []) {
                    if (comp.score === null)
                        delete next.components[comp.component];
                    else
                        next.components[comp.component] = { score: comp.score, comment: comp.comment ?? null };
                }
            }
            if (localSubmitted[c.id] && next.attempt.status !== "submitted") {
                next.attempt = { ...next.attempt, status: "submitted", submittedAt: new Date() };
            }
            return next;
        });
    }, [data, queue.pendingItems, localSubmitted]);
    const [search, setSearch] = useState("");
    const [selectedId, setSelectedId] = useState(null);
    const filtered = useMemo(() => {
        const s = search.trim().toLowerCase();
        if (!s)
            return candidates;
        return candidates.filter((c) => c.examNumber.toLowerCase().includes(s) || c.fullName.toLowerCase().includes(s));
    }, [candidates, search]);
    const selected = candidates.find((c) => c.id === selectedId) ?? null;
    const isProcedure = data?.station?.kind === "procedure";
    const submitCandidate = useCallback((candidateId, auto) => {
        if (submitQueued.current.has(candidateId))
            return;
        submitQueued.current.add(candidateId);
        setLocalSubmitted((s) => ({ ...s, [candidateId]: true }));
        queue.enqueue({ type: "submit", candidateId, auto });
    }, [queue]);
    // Auto-submit any OTHER candidate whose station time has run out (the open
    // score sheet handles its own candidate so unsaved taps are flushed first).
    const serverNow = data?.settings.serverNow;
    const [, tick] = useState(0);
    useEffect(() => {
        const t = setInterval(() => tick((n) => n + 1), 1000);
        return () => clearInterval(t);
    }, []);
    const offset = useMemo(() => (serverNow ? new Date(serverNow).getTime() - Date.now() : 0), [serverNow]);
    useEffect(() => {
        if (!isProcedure || !data?.examiner.canEdit)
            return;
        const now = Date.now() + offset;
        for (const c of candidates) {
            if (c.id === selectedId)
                continue;
            if (c.attempt.status === "in_progress" && c.attempt.endsAt && new Date(c.attempt.endsAt).getTime() <= now) {
                submitCandidate(c.id, true);
            }
        }
    });
    const [starting, setStarting] = useState(false);
    const startTimer = async (candidateId) => {
        setStarting(true);
        try {
            await postExaminerStation(token, { action: "start", candidateId });
            await qc.invalidateQueries({ queryKey: ["examinerData", token] });
        }
        catch (err) {
            toast.error(err.status === 0
                ? "No connection — the station timer can only be started while online."
                : err.message);
        }
        finally {
            setStarting(false);
        }
    };
    const signOut = async () => {
        try {
            await postLogout(token);
        }
        catch { }
        onSignOut();
    };
    const stationLabel = data?.station ? `Station ${data.station.number}` : "No station";
    const goNext = () => {
        if (!selected)
            return;
        const idx = filtered.findIndex((c) => c.id === selected.id);
        const next = filtered[idx + 1];
        if (next)
            setSelectedId(next.id);
    };
    return (<div className={styles.page}>
      <Helmet>
        <title>{`Examiner · ${stationLabel}`}</title>
      </Helmet>
      <ExamHeader settings={settings} context={data ? `${data.examiner.fullName} · ${stationLabel}` : undefined} right={<>
            <SyncStatus online={queue.online} pending={queue.pending} syncing={queue.syncing}/>
            <ExamTimer clock={clock}/>
            <Button variant="ghost" size="icon" onClick={signOut} aria-label="Sign out" title="Sign out">
              <LogOut size={18}/>
            </Button>
          </>}/>

      {!data ? (<div className={styles.loading}>
          {query.isError ? <p>{query.error.message}</p> : <Skeleton style={{ width: "100%", height: 320 }}/>}
        </div>) : settings && !settings.examinerAccessOpen ? (<div className={styles.placeholder}>
          <div>
            <Lock size={36}/>
            <h2 className={styles.closedTitle}>Examiner access is closed</h2>
            <p>The control room has hidden the examination. This screen opens automatically when it is made available again.</p>
          </div>
        </div>) : (<div className={styles.desk}>
          <aside className={styles.listPane}>
            <StationCard data={data}/>
            <div className={styles.searchRow}>
              <Search size={16} className={styles.searchIcon}/>
              <Input placeholder="Search exam number or name" value={search} onChange={(e) => setSearch(e.target.value)} className={styles.searchInput} aria-label="Search candidates"/>
            </div>
            <div className={styles.listMeta}>
              <span>
                {filtered.length} of {candidates.length} candidates
              </span>
              <Button variant="ghost" size="sm" disabled={query.isFetching} onClick={() => query.refetch()} title="Refresh the list (e.g. to see a timer started by another examiner)">
                <RefreshCw size={13} className={query.isFetching ? styles.spin : ""}/> Refresh
              </Button>
            </div>
            <ul className={styles.list}>
              {filtered.map((c) => (<li key={c.id}>
                  <button type="button" className={`${styles.row} ${c.id === selectedId ? styles.rowActive : ""}`} onClick={() => setSelectedId(c.id)}>
                    <span className={styles.rowMain}>
                      <span className={styles.examNo}>{c.examNumber}</span>
                      <span className={styles.name}>{c.fullName}</span>
                    </span>
                    <CandidateStatus data={data} c={c} offset={offset}/>
                  </button>
                </li>))}
              {filtered.length === 0 ? <li className={styles.empty}>No candidates match.</li> : null}
            </ul>
          </aside>

          <section className={styles.scorePane}>
            {selected ? (<ScoreSheet key={selected.id} data={data} candidate={selected} maxFor={{
                    project: settings?.projectMax ?? data.settings.projectMax,
                    viva: settings?.vivaMax ?? data.settings.vivaMax,
                    client_care: settings?.clientCareMax ?? data.settings.clientCareMax,
                }} starting={starting} onStart={() => startTimer(selected.id)} onSave={(input) => queue.enqueue({ type: "score", input })} onSubmit={(auto) => {
                    submitCandidate(selected.id, auto);
                    toast[auto ? "info" : "success"](auto
                        ? `Time up — Station ${data.station?.number} submitted for ${selected.examNumber}`
                        : `Station ${data.station?.number} submitted for ${selected.examNumber}`);
                }} onNext={goNext}/>) : (<div className={styles.placeholder}>
                <p>Select a candidate from the list to begin.</p>
              </div>)}
          </section>
        </div>)}
    </div>);
}
function StationCard({ data }) {
    const st = data.station;
    return (<div className={styles.stationCard}>
      <span className={styles.stationNo}>{st ? st.number : "–"}</span>
      <div>
        <div className={styles.stationTitle}>{st ? st.title : "Not assigned to a station"}</div>
        <div className={styles.stationSub}>
          {st?.kind === "procedure"
            ? `${data.checklist.length} items · ${data.checklist.reduce((a, b) => a + b.maxScore, 0)} marks · ${st.durationMinutes} min per candidate`
            : st?.kind === "question"
                ? `${data.questionCount} questions · ${st.durationMinutes} min · machine-marked`
                : "The control room will assign you"}
          {!data.examiner.canEdit ? " · view only" : ""}
        </div>
      </div>
    </div>);
}
function procedureTotal(data, c) {
    return data.checklist.reduce((a, it) => a + (c.itemScores[it.id] ?? 0), 0);
}
function CandidateStatus({ data, c, offset }) {
    const a = c.attempt;
    const left = a.status === "in_progress" && a.endsAt ? Math.max(0, new Date(a.endsAt).getTime() - (Date.now() + offset)) : null;
    if (data.station?.kind === "question") {
        return (<span className={styles.status}>
        <span className={styles.mono}>
          {c.answeredCount}/{data.questionCount}
        </span>
        {a.status === "submitted" ? (<Badge variant="success">Submitted</Badge>) : a.status === "in_progress" ? (<Badge variant="warning">{left !== null ? formatDuration(left) : "In progress"}</Badge>) : null}
      </span>);
    }
    if (data.station?.kind === "procedure") {
        return (<span className={styles.status}>
        {a.status === "submitted" ? (<Badge variant="success">
            <Lock size={11}/> <span className={styles.mono}>{procedureTotal(data, c)}</span>
          </Badge>) : a.status === "in_progress" ? (<Badge variant="warning">
            <span className={styles.mono}>{left !== null ? formatDuration(left) : "…"}</span>
          </Badge>) : (<Badge variant="outline">Not started</Badge>)}
      </span>);
    }
    const comps = data.examiner.components.filter((k) => c.components[k]).length;
    return data.examiner.components.length > 0 ? (<Badge variant={comps === data.examiner.components.length ? "success" : "outline"}>
      {comps}/{data.examiner.components.length}
    </Badge>) : null;
}
function ScoreButtons({ max, value, onChange, disabled, }) {
    // Partial credit: 0, 0.25, 0.5 and full marks for 1-mark items; quarter
    // steps up to the maximum for larger items.
    let options = null;
    if (max <= 1) {
        options = [...new Set([0, 0.25, 0.5, max].filter((v) => v <= max))];
    }
    else if (max <= 3 && Number.isInteger(max * 4)) {
        options = Array.from({ length: max * 4 + 1 }, (_, i) => i / 4);
    }
    if (options) {
        return (<div className={styles.scoreBtns} role="radiogroup">
        {options.map((v) => (<button key={v} type="button" role="radio" aria-checked={value === v} disabled={disabled} className={`${styles.scoreBtn} ${value === v ? styles.scoreBtnOn : ""}`} onClick={() => onChange(value === v ? null : v)}>
            {v}
          </button>))}
      </div>);
    }
    return (<Input type="number" min={0} max={max} step="0.25" value={value ?? ""} disabled={disabled} className={styles.scoreInput} onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}/>);
}
function ScoreSheet({ data, candidate, maxFor, starting, onStart, onSave, onSubmit, onNext, }) {
    const canEdit = data.examiner.canEdit;
    const isProcedure = data.station?.kind === "procedure";
    const attempt = candidate.attempt;
    const inProgress = attempt.status === "in_progress";
    const submitted = attempt.status === "submitted";
    const itemsEditable = canEdit && isProcedure && inProgress;
    const remaining = useServerCountdown(inProgress ? attempt.endsAt : null, data.settings.serverNow);
    const [draft, setDraft] = useState(() => ({
        items: Object.fromEntries(data.checklist.map((it) => [it.id, candidate.itemScores[it.id] ?? null])),
        components: Object.fromEntries(data.examiner.components.map((k) => [
            k,
            { score: candidate.components[k]?.score ?? null, comment: candidate.components[k]?.comment ?? "" },
        ])),
    }));
    const [endOpen, setEndOpen] = useState(false);
    // ---- autosave (debounced) so nothing is lost when switching candidates ----
    const dirty = useRef({ items: false, comps: false });
    const timer = useRef(null);
    const draftRef = useRef(draft);
    draftRef.current = draft;
    const buildInput = useCallback((includeItems, includeComps) => {
        const d = draftRef.current;
        const itemScores = includeItems && isProcedure ? data.checklist.map((it) => ({ checklistItemId: it.id, score: d.items[it.id] ?? null })) : [];
        const components = includeComps
            ? data.examiner.components
                .filter((k) => {
                const s = d.components[k]?.score;
                return s === null || s === undefined || (s >= 0 && s <= maxFor[k]);
            })
                .map((k) => ({
                component: k,
                score: d.components[k]?.score ?? null,
                comment: d.components[k]?.comment?.trim() ? d.components[k].comment.trim() : null,
            }))
            : [];
        if (itemScores.length === 0 && components.length === 0)
            return null;
        return { candidateId: candidate.id, itemScores, components };
    }, [candidate.id, data.checklist, data.examiner.components, isProcedure, maxFor]);
    const flush = useCallback(() => {
        if (timer.current) {
            clearTimeout(timer.current);
            timer.current = null;
        }
        const { items, comps } = dirty.current;
        if (!items && !comps)
            return;
        dirty.current = { items: false, comps: false };
        const input = buildInput(items, comps);
        if (input)
            onSave(input);
    }, [buildInput, onSave]);
    const scheduleSave = (kind) => {
        dirty.current[kind] = true;
        if (timer.current)
            clearTimeout(timer.current);
        timer.current = setTimeout(flush, 900);
    };
    // Flush on unmount (switching candidate).
    const flushRef = useRef(flush);
    flushRef.current = flush;
    useEffect(() => () => flushRef.current(), []);
    // Automatic submission when this candidate's station time runs out.
    const autoDone = useRef(false);
    useEffect(() => {
        if (!itemsEditable || autoDone.current)
            return;
        if (remaining !== null && remaining <= 0) {
            autoDone.current = true;
            flush();
            onSubmit(true);
        }
    }, [remaining, itemsEditable, flush, onSubmit]);
    const tabs = [];
    if (data.station)
        tabs.push("station");
    for (const k of data.examiner.components)
        tabs.push(k);
    const stationTotal = data.checklist.reduce((a, it) => a + (draft.items[it.id] ?? 0), 0);
    const stationMax = data.checklist.reduce((a, it) => a + it.maxScore, 0);
    const unmarked = data.checklist.filter((it) => draft.items[it.id] === null).length;
    if (tabs.length === 0) {
        return (<div className={styles.placeholder}>
        <p>You have no station or assessment assigned yet.</p>
      </div>);
    }
    const tone = remaining === null ? "" : remaining < 60000 ? styles.timeDanger : remaining < 120000 ? styles.timeWarn : styles.timeOk;
    return (<div className={styles.sheet}>
      <div className={styles.sheetHead}>
        <div>
          <div className={styles.sheetExamNo}>{candidate.examNumber}</div>
          <div className={styles.sheetName}>{candidate.fullName}</div>
        </div>
        {isProcedure ? (<div className={styles.totalBox}>
            <span className={styles.totalLabel}>Station total</span>
            <span className={styles.totalValue}>
              {stationTotal}
              <small>/{stationMax}</small>
            </span>
          </div>) : null}
      </div>

      {!canEdit ? (<div className={styles.viewOnly}>
          <Eye size={16}/> View-only examiner — marks cannot be changed from this device.
        </div>) : null}

      {isProcedure && canEdit ? (<div className={`${styles.timerBar} ${tone}`}>
          {attempt.status === "not_started" ? (<>
              <div>
                <strong>Station timer: {data.station?.durationMinutes} minutes</strong>
                <div className={styles.muted}>Start when the candidate enters the station. Marking opens with the timer.</div>
              </div>
              <Button size="lg" onClick={onStart} disabled={starting || data.checklist.length === 0}>
                {starting ? <Spinner size="sm"/> : <Play size={16}/>} Start station
              </Button>
            </>) : inProgress ? (<>
              <div className={styles.timerBlock}>
                <span className={styles.timerLabel}>Time left</span>
                <span className={styles.timerValue}>{remaining !== null ? formatDuration(remaining) : "--:--"}</span>
              </div>
              <Button variant="destructive" size="lg" onClick={() => setEndOpen(true)}>
                <Square size={16}/> End exam
              </Button>
            </>) : (<>
              <div>
                <strong>
                  <Lock size={14}/> Station submitted{attempt.autoSubmitted ? " automatically (time up)" : ""}
                </strong>
                <div className={styles.muted}>Checklist marks are locked. The control room can re-open it if needed.</div>
              </div>
              <Button variant="outline" onClick={onNext}>
                Next candidate <ChevronRight size={16}/>
              </Button>
            </>)}
        </div>) : null}

      <Tabs defaultValue={tabs[0]} className={styles.tabs}>
        <TabsList>
          {data.station ? <TabsTrigger value="station">Station {data.station.number}</TabsTrigger> : null}
          {data.examiner.components.map((k) => (<TabsTrigger key={k} value={k}>
              {COMPONENT_LABEL[k]}
            </TabsTrigger>))}
        </TabsList>

        {data.station ? (<TabsContent value="station">
            {isProcedure ? (data.checklist.length === 0 ? (<p className={styles.muted}>No checklist has been uploaded for this station yet.</p>) : (<ol className={`${styles.checklist} ${!itemsEditable ? styles.checklistLocked : ""}`}>
                  {data.checklist.map((it, i) => (<li key={it.id} className={styles.checkItem}>
                      <span className={styles.checkNo}>{i + 1}</span>
                      <span className={styles.checkText}>{it.description}</span>
                      <span className={styles.checkScore}>
                        <ScoreButtons max={it.maxScore} value={draft.items[it.id] ?? null} disabled={!itemsEditable} onChange={(v) => {
                        setDraft((d) => ({ ...d, items: { ...d.items, [it.id]: v } }));
                        scheduleSave("items");
                    }}/>
                        <span className={styles.checkMax}>/ {it.maxScore}</span>
                      </span>
                    </li>))}
                </ol>)) : (<div className={styles.questionProgress}>
                <div className={styles.bigNumber}>
                  {candidate.answeredCount}
                  <small>/{data.questionCount}</small>
                </div>
                <p>questions answered at this station</p>
                <Badge variant={submitted ? "success" : attempt.status === "in_progress" ? "warning" : "outline"}>
                  {submitted ? "Station submitted" : attempt.status === "in_progress" ? "Writing now" : "Not started"}
                </Badge>
                <p className={styles.muted}>
                  Question stations are marked automatically. Answers and scores are only visible in the control
                  room results.
                </p>
              </div>)}
          </TabsContent>) : null}

        {data.examiner.components.map((k) => {
            const val = draft.components[k];
            return (<TabsContent key={k} value={k}>
              <div className={styles.compForm}>
                <label className={styles.compField}>
                  <span>
                    {COMPONENT_LABEL[k]} mark <em className={styles.muted}>(allocated: {maxFor[k]})</em>
                  </span>
                  <div className={styles.compScoreRow}>
                    <Input type="number" min={0} max={maxFor[k]} step="0.25" inputMode="decimal" value={val?.score ?? ""} disabled={!canEdit} className={styles.scoreInput} onChange={(e) => {
                    setDraft((d) => ({
                        ...d,
                        components: {
                            ...d.components,
                            [k]: { comment: d.components[k]?.comment ?? "", score: e.target.value === "" ? null : Number(e.target.value) },
                        },
                    }));
                    scheduleSave("comps");
                }}/>
                    <span className={styles.checkMax}>/ {maxFor[k]}</span>
                  </div>
                  {val?.score !== null && val?.score !== undefined && val.score > maxFor[k] ? (<span className={styles.err}>Cannot exceed the allocation of {maxFor[k]} — not saved.</span>) : null}
                </label>
                <label className={styles.compField}>
                  <span>Examiner's comment (optional)</span>
                  <Textarea rows={3} value={val?.comment ?? ""} disabled={!canEdit} onChange={(e) => {
                    setDraft((d) => ({
                        ...d,
                        components: { ...d.components, [k]: { score: d.components[k]?.score ?? null, comment: e.target.value } },
                    }));
                    scheduleSave("comps");
                }}/>
                </label>
              </div>
            </TabsContent>);
        })}
      </Tabs>

      {canEdit ? (<div className={styles.saveBar}>
          <span className={styles.muted}>
            <Check size={14}/> Marks save automatically
            {isProcedure && inProgress && unmarked > 0 ? ` · ${unmarked} item${unmarked === 1 ? "" : "s"} not marked` : ""}
          </span>
          <Button variant="outline" onClick={() => {
                flush();
                onNext();
            }}>
            Next candidate <ChevronRight size={16}/>
          </Button>
        </div>) : null}

      <Dialog open={endOpen} onOpenChange={setEndOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>End exam for {candidate.examNumber}?</DialogTitle>
            <DialogDescription>
              Station {data.station?.number} will be submitted with a total of {stationTotal}/{stationMax}
              {unmarked > 0 ? ` (${unmarked} item${unmarked === 1 ? "" : "s"} left unmarked count as 0)` : ""}. Checklist
              marks are then locked.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEndOpen(false)}>
              Keep marking
            </Button>
            <Button variant="destructive" onClick={() => {
            setEndOpen(false);
            dirty.current.items = true;
            flush();
            onSubmit(false);
        }}>
              Submit station
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>);
}
