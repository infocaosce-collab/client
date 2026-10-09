import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Undo2, Search, Printer } from "lucide-react";
import { Button } from "../../shared/ui/actions/Button";
import { Input } from "../../shared/ui/forms/Input";
import { Badge } from "../../shared/ui/feedback/Badge";
import { Checkbox } from "../../shared/ui/forms/Checkbox";
import { CsvImport } from "../../shared/ui/forms/CsvImport";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../shared/ui/forms/Select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription, } from "../../shared/ui/overlays/Dialog";
import { useAdminAction } from "../../../helpers/useAdminAction";
import styles from "./AdminPeoplePanel.module.css";
function mapCandidates(records) {
    const rows = [];
    const errors = [];
    records.forEach((r, i) => {
        const examNumber = r.exam_number || r.exam_no || r.matric_number || r.matric_no || r.reg_number || "";
        const fullName = r.full_name || r.name || [r.first_name, r.last_name].filter(Boolean).join(" ");
        if (!examNumber || !fullName)
            errors.push(`Line ${i + 2}: exam_number and full_name are required`);
        else
            rows.push({ examNumber, fullName, pin: r.pin || undefined, ...(r.assigned_stations ? { assignedStations: String(r.assigned_stations).split(/[,;|]/).filter(Boolean).map(Number) } : {}) });
    });
    return { rows, errors };
}
const COMPONENTS = [
    { key: "project", label: "Project" },
    { key: "viva", label: "Viva" },
    { key: "client_care", label: "Client care" },
];
export const AdminCandidatesPanel = ({ token, data }) => {
    const action = useAdminAction(token);
    const [search, setSearch] = useState("");
    const [editing, setEditing] = useState(null);
    const [deleting, setDeleting] = useState(null);
    const [reopening, setReopening] = useState(null);
    const [reviewing, setReviewing] = useState(null);
    const list = useMemo(() => {
        const s = search.trim().toLowerCase();
        return s
            ? data.candidates.filter((c) => c.examNumber.toLowerCase().includes(s) || c.fullName.toLowerCase().includes(s))
            : data.candidates;
    }, [data.candidates, search]);
    const printSlips = () => {
        const w = window.open("", "_blank");
        if (!w)
            return;
        const esc = (s) => s.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
        const rows = data.candidates
            .map((c) => `<div class="slip"><b>${esc(data.settings.institutionName)}</b><br/>${esc(c.fullName)}<br/>Exam no: <code>${esc(c.examNumber)}</code><br/>PIN: <code>${esc(c.pin)}</code></div>`)
            .join("");
        w.document.write(`<html><head><title>Login slips</title><style>body{font-family:sans-serif}.slip{display:inline-block;width:45%;margin:8px;padding:12px;border:1px dashed #999}code{font-size:1.1em}</style></head><body>${rows}</body></html>`);
        w.document.close();
        w.print();
    };
    return (<div className={styles.wrap}>
      <CsvImport title="Upload candidates" description="One row per candidate. Leave the PIN blank to generate a 4-digit PIN." templateName="candidates_template.csv" templateHeaders={["exam_number", "full_name", "pin", "assigned_stations"]} templateSample={[
            ["NS/2026/001", "Aisha Musa", "4821", "2"],
            ["NS/2026/002", "Ibrahim Sani", "", "4,6"],
        ]} mapRows={mapCandidates} replaceHint="removes every existing candidate and their answers/marks" onImport={(rows, mode) => action.mutateAsync({ action: "importCandidates", rows, mode })}/>

      <section className={styles.tableCard}>
        <div className={styles.toolbar}>
          <div className={styles.search}>
            <Search size={16}/>
            <Input placeholder="Search candidates" value={search} onChange={(e) => setSearch(e.target.value)}/>
          </div>
          <div className={styles.toolbarBtns}>
            <Button variant="outline" size="sm" onClick={printSlips} disabled={data.candidates.length === 0}>
              <Printer size={14}/> Print login slips
            </Button>
            <Button size="sm" onClick={() => setEditing({assignedStations: data.stations.filter(s=>s.kind === "question").slice(0,1).map(s=>s.number)})}>
              <Plus size={14}/> Add candidate
            </Button>
          </div>
        </div>
        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Exam no.</th>
                <th>Name</th>
                <th>PIN</th>
                <th>Answered</th>
                <th>Stations</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {list.map((c) => (<tr key={c.id}>
                  <td className={styles.mono}>{c.examNumber}</td>
                  <td>{c.fullName}</td>
                  <td className={styles.mono}>{c.pin}</td>
                  <td className={styles.mono}>
                    {c.answeredCount}/{data.questions.length}
                  </td>
                  <td>
                    <div className={styles.chips}>
                      {data.stations.filter(s => s.kind === "procedure" || !Array.isArray(c.assignedStations) || c.assignedStations.includes(s.number)).map((s) => {
                const a = c.attempts[s.number];
                const st = a?.status ?? "not_started";
                return (<button key={s.number} type="button" className={`${styles.chip} ${st === "submitted" ? styles.chipDone : st === "in_progress" ? styles.chipLive : ""}`} title={`Station ${s.number}: ${st.replace("_", " ")}${a?.autoSubmitted ? " (auto-submitted)" : ""}${st !== "not_started" ? " — click to re-open" : ""}`} disabled={st === "not_started"} onClick={() => setReopening({ c, station: s.number })}>
                            {s.number}
                          </button>);
            })}
                    </div>
                  </td>
                  <td>{c.security?.count > 0 && <button type="button" style={{ border: 0, background: "transparent", padding: 0, cursor: "pointer" }} onClick={() => setReviewing(c)} title="Review browser-security incident history"><Badge variant="destructive">Warnings {c.security.count}/3</Badge></button>} {c.security?.locked ? <Badge variant="destructive">Security locked</Badge> : c.submittedAt ? <Badge variant="success">Submitted</Badge> : <Badge variant="outline">Open</Badge>}</td>
                  <td className={styles.rowActions}>
                    {c.security?.count > 0 && <Button variant="outline" size="sm" title="Review incidents before clearing warnings" onClick={() => { if (window.confirm(`Clear security warnings for ${c.fullName}? The audit trail will remain.`)) action.mutate({ action: "resetSecurityWarnings", candidateId: c.id }); }}>Clear warnings</Button>}
                    {c.submittedAt ? (<Button variant="ghost" size="icon-sm" title="Allow to continue" onClick={() => action.mutate({ action: "reopenCandidate", id: c.id })}>
                        <Undo2 size={14}/>
                      </Button>) : null}
                    <Button variant="ghost" size="icon-sm" title="Edit" onClick={() => setEditing({...c, assignedStations: c.assignedStations ?? data.stations.filter(s=>s.kind==="question").slice(0,1).map(s=>s.number)})}>
                      <Pencil size={14}/>
                    </Button>
                    <Button variant="ghost" size="icon-sm" title="Delete" onClick={() => setDeleting(c)}>
                      <Trash2 size={14}/>
                    </Button>
                  </td>
                </tr>))}
              {list.length === 0 ? (<tr>
                  <td colSpan={7} className={styles.empty}>
                    {data.candidates.length === 0 ? "No candidates yet — upload a CSV above." : "No match."}
                  </td>
                </tr>) : null}
            </tbody>
          </table>
        </div>
      </section>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit candidate" : "Add candidate"}</DialogTitle>
          </DialogHeader>
          {editing ? (<form className={styles.form} onSubmit={(e) => {
                e.preventDefault();
                action.mutate({
                    action: "saveCandidate",
                    id: editing.id,
                    row: { examNumber: editing.examNumber ?? "", fullName: editing.fullName ?? "", pin: editing.pin ?? "", assignedStations: editing.assignedStations ?? [] },
                }, { onSuccess: () => setEditing(null) });
            }}>
              <label className={styles.field}>
                <span>Exam number</span>
                <Input required value={editing.examNumber ?? ""} onChange={(e) => setEditing({ ...editing, examNumber: e.target.value })}/>
              </label>
              <label className={styles.field}>
                <span>Full name</span>
                <Input required value={editing.fullName ?? ""} onChange={(e) => setEditing({ ...editing, fullName: e.target.value })}/>
              </label>
              <label className={styles.field}>
                <span>PIN (blank = generate)</span>
                <Input value={editing.pin ?? ""} onChange={(e) => setEditing({ ...editing, pin: e.target.value })}/>
              </label>
              <fieldset className={styles.fieldset}>
                <legend>Assigned question stations (choose one or more)</legend>
                {data.stations.filter(st=>st.kind==="question").map(st=><label className={styles.check} key={st.number}>
                  <Checkbox checked={(editing.assignedStations ?? []).includes(st.number)} onChange={e=>setEditing({
                    ...editing,
                    assignedStations: e.target.checked ? [...(editing.assignedStations??[]), st.number]
                      : (editing.assignedStations??[]).filter(n=>n!==st.number),
                  })}/>
                  Station {st.number} — {st.title || "Question station"}
                </label>)}
              </fieldset>
              <DialogFooter>
                <Button type="submit" disabled={action.isPending}>
                  Save
                </Button>
              </DialogFooter>
            </form>) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {deleting?.fullName}?</DialogTitle>
            <DialogDescription>Their answers and all marks recorded for them are deleted too.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => deleting && action.mutate({ action: "deleteCandidate", id: deleting.id }, { onSettled: () => setDeleting(null) })}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!reviewing} onOpenChange={(o) => !o && setReviewing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Security history — {reviewing?.fullName}</DialogTitle>
            <DialogDescription>Browser interruption reports are indications, not proof of malpractice. Review before clearing warnings.</DialogDescription>
          </DialogHeader>
          <div style={{ maxHeight: 300, overflowY: "auto", fontSize: 13 }}>
            {(data.securityIncidents?.find(i => i.candidateId === reviewing?.id)?.events || []).map((e, i) =>
              <p key={e.id || i} style={{ padding: "8px 0", borderBottom: "1px solid #e2e8f0" }}>
                <strong>{e.type?.replace(/_/g, " ")}</strong> — {e.receivedAt ? new Date(e.receivedAt).toLocaleString() : "Unknown time"}
                {e.counted ? " · Counted" : " · Not counted"}
              </p>)}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setReviewing(null)}>Close</Button>
            <Button disabled={action.isPending} onClick={() => reviewing && action.mutate(
              { action: "resetSecurityWarnings", candidateId: reviewing.id }, { onSuccess: () => setReviewing(null) })}>Clear warning count</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!reopening} onOpenChange={(o) => !o && setReopening(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Re-open Station {reopening?.station} for {reopening?.c.fullName}?
            </DialogTitle>
            <DialogDescription>
              The station's timer is cleared so it can be started again with a full time allocation. Answers and marks
              already recorded are kept and can be changed.
            </DialogDescription>
          </DialogHeader>
          {reopening && reopening.c.attempts[reopening.station]?.status === "in_progress" ? (<div className={styles.extendBox}>
              <span>
                In progress — give extra time instead (e.g. after a network problem):
              </span>
              <div className={styles.extendBtns}>
                {[2, 5, 10].map((m) => (<Button key={m} variant="secondary" size="sm" disabled={action.isPending} onClick={() => action.mutate({
                    action: "extendStationAttempt",
                    candidateId: reopening.c.id,
                    stationNumber: reopening.station,
                    minutes: m,
                }, { onSuccess: () => setReopening(null) })}>
                    +{m} min
                  </Button>))}
              </div>
            </div>) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReopening(null)}>
              Cancel
            </Button>
            <Button onClick={() => reopening &&
            action.mutate({ action: "resetStationAttempt", candidateId: reopening.c.id, stationNumber: reopening.station }, { onSettled: () => setReopening(null) })}>
              Re-open station
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>);
};
const emptyExaminer = {
    fullName: "",
    username: "",
    pin: "",
    stationNumber: null,
    canEdit: true,
    components: [],
};
export const AdminExaminersPanel = ({ token, data }) => {
    const action = useAdminAction(token);
    const [editing, setEditing] = useState(null);
    const [deleting, setDeleting] = useState(null);
    const stationKind = (n) => data.stations.find((s) => s.number === n)?.kind;
    return (<div className={styles.wrap}>
      <section className={styles.stationBoard}>
        {data.stations.map((s) => {
            const assigned = data.examiners.filter((e) => e.stationNumber === s.number);
            return (<div key={s.number} className={styles.boardCell}>
              <div className={styles.boardHead}>
                <span className={styles.boardNo}>{s.number}</span>
                <span className={styles.boardKind}>{s.kind === "procedure" ? "Procedure" : "Questions"}</span>
                <span className={styles.boardCount}>{assigned.length} examiner{assigned.length === 1 ? "" : "s"}</span>
              </div>
              <ul className={styles.boardList}>
                {assigned.map((e) => (<li key={e.id}>
                    <button type="button" className={styles.boardName} onClick={() => setEditing({ ...e })}>
                      {e.fullName}
                    </button>
                  </li>))}
                {assigned.length === 0 ? <li className={styles.muted}>None yet</li> : null}
              </ul>
              <Button variant="outline" size="sm" onClick={() => setEditing({ ...emptyExaminer, stationNumber: s.number, canEdit: s.kind === "procedure" })}>
                <Plus size={14}/> Add to station {s.number}
              </Button>
            </div>);
        })}
      </section>
      <section className={styles.tableCard}>
        <div className={styles.toolbar}>
          <p className={styles.note}>
            Any number of examiners can share a station — each sees only that station. Examiners on question stations
            are always view-only; they can monitor progress but not change marks.
          </p>
          <Button size="sm" onClick={() => setEditing({ ...emptyExaminer })}>
            <Plus size={14}/> Add examiner
          </Button>
        </div>
        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Username</th>
                <th>PIN</th>
                <th>Station</th>
                <th>Also marks</th>
                <th>Access</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.examiners.map((e) => (<tr key={e.id}>
                  <td>{e.fullName}</td>
                  <td className={styles.mono}>{e.username}</td>
                  <td className={styles.mono}>{e.pin}</td>
                  <td>
                    {e.stationNumber
                ? `Station ${e.stationNumber} · ${stationKind(e.stationNumber) === "procedure" ? "Procedure" : "Questions"}`
                : "—"}
                  </td>
                  <td>{e.components.map((k) => COMPONENTS.find((c) => c.key === k)?.label).join(", ") || "—"}</td>
                  <td>{e.canEdit ? <Badge variant="primary">Can mark</Badge> : <Badge variant="secondary">View only</Badge>}</td>
                  <td className={styles.rowActions}>
                    <Button variant="ghost" size="icon-sm" title="Edit" onClick={() => setEditing({ ...e })}>
                      <Pencil size={14}/>
                    </Button>
                    <Button variant="ghost" size="icon-sm" title="Delete" onClick={() => setDeleting(e)}>
                      <Trash2 size={14}/>
                    </Button>
                  </td>
                </tr>))}
              {data.examiners.length === 0 ? (<tr>
                  <td colSpan={7} className={styles.empty}>
                    No examiners yet.
                  </td>
                </tr>) : null}
            </tbody>
          </table>
        </div>
      </section>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit examiner" : "Add examiner"}</DialogTitle>
          </DialogHeader>
          {editing ? (<form className={styles.form} onSubmit={(ev) => {
                ev.preventDefault();
                action.mutate({ action: "saveExaminer", ...editing }, { onSuccess: () => setEditing(null) });
            }}>
              <label className={styles.field}>
                <span>Full name</span>
                <Input required value={editing.fullName} onChange={(e) => setEditing({ ...editing, fullName: e.target.value })}/>
              </label>
              <div className={styles.twoCol}>
                <label className={styles.field}>
                  <span>Username</span>
                  <Input required value={editing.username} onChange={(e) => setEditing({ ...editing, username: e.target.value })}/>
                </label>
                <label className={styles.field}>
                  <span>PIN (min 4)</span>
                  <Input required minLength={4} value={editing.pin} onChange={(e) => setEditing({ ...editing, pin: e.target.value })}/>
                </label>
              </div>
              <label className={styles.field}>
                <span>Assigned station</span>
                <Select value={editing.stationNumber ? String(editing.stationNumber) : "__none"} onValueChange={(v) => {
                const n = v === "__none" ? null : Number(v);
                setEditing({ ...editing, stationNumber: n, canEdit: stationKind(n) === "question" ? false : editing.canEdit });
            }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">No station</SelectItem>
                    {data.stations.map((s) => (<SelectItem key={s.number} value={String(s.number)}>
                        Station {s.number} — {s.title} ({s.kind === "procedure" ? "procedure" : "questions"})
                      </SelectItem>))}
                  </SelectContent>
                </Select>
              </label>
              <fieldset className={styles.fieldset}>
                <legend>Also marks</legend>
                {COMPONENTS.map((c) => (<label key={c.key} className={styles.check}>
                    <Checkbox checked={editing.components.includes(c.key)} onChange={(e) => setEditing({
                    ...editing,
                    components: e.target.checked
                        ? [...editing.components, c.key]
                        : editing.components.filter((k) => k !== c.key),
                })}/>
                    {c.label}
                  </label>))}
              </fieldset>
              <label className={styles.check}>
                <Checkbox checked={editing.canEdit} disabled={stationKind(editing.stationNumber) === "question"} onChange={(e) => setEditing({ ...editing, canEdit: e.target.checked })}/>
                Can enter and change marks
                {stationKind(editing.stationNumber) === "question" ? (<span className={styles.muted}> — question-station examiners are view-only</span>) : null}
              </label>
              <DialogFooter>
                <Button type="submit" disabled={action.isPending}>
                  Save examiner
                </Button>
              </DialogFooter>
            </form>) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove {deleting?.fullName}?</DialogTitle>
            <DialogDescription>Marks they already recorded are kept.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => deleting && action.mutate({ action: "deleteExaminer", id: deleting.id }, { onSettled: () => setDeleting(null) })}>
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>);
};
