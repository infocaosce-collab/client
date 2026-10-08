import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Search, RotateCcw } from "lucide-react";
import { Button } from "./Button";
import { Input } from "./Input";
import { Skeleton } from "./Skeleton";
import { Checkbox } from "./Checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, } from "./Dialog";
import { getAdminResults } from "../endpoints/admin/results_GET.schema";
import { csv } from "../helpers/csv";
import { useLiveSignal } from "../helpers/useLiveSignal";
import { useAdminAction } from "../helpers/useAdminAction";
import styles from "./AdminResultsPanel.module.css";
function exportCsv(r) {
    const headers = [
        "Exam Number",
        "Full Name",
        ...r.stations.map((s) => `Station ${s.number} ${s.kind === "procedure" ? "(Procedure)" : "(Questions)"} /${s.maxScore}`),
        "Procedure Stations Total",
        "Question Stations Total",
        `Project /${r.componentMax.project}`,
        `Viva /${r.componentMax.viva}`,
        `Client Care Study /${r.componentMax.clientCare}`,
        `Total /${r.maxTotal}`,
        "Percentage",
        "CBT Submitted",
    ];
    const rows = r.rows.map((c) => {
        const proc = c.stations.filter((s) => s.station % 2 === 1).reduce((a, s) => a + s.score, 0);
        const ques = c.stations.filter((s) => s.station % 2 === 0).reduce((a, s) => a + s.score, 0);
        return [
            c.examNumber,
            c.fullName,
            ...c.stations.map((s) => s.score),
            Math.round(proc * 100) / 100,
            Math.round(ques * 100) / 100,
            c.project ?? "",
            c.viva ?? "",
            c.clientCare ?? "",
            c.total,
            c.percentage,
            c.submitted ? "Yes" : "No",
        ];
    });
    const title = [[r.institutionName], [r.examTitle], [`Exported ${new Date().toLocaleString()}`], []];
    const body = csv.stringify(headers, rows);
    const pre = title.map((t) => t.join(",")).join("\r\n");
    const stamp = new Date().toISOString().slice(0, 10);
    csv.download(`osce_results_${stamp}.csv`, pre + "\r\n" + body);
}
export const AdminResultsPanel = ({ token }) => {
    useLiveSignal([["adminResults", token]], ["progress", "content", "candidates", "settings"]);
    const q = useQuery({
        queryKey: ["adminResults", token],
        queryFn: () => getAdminResults(token),
        placeholderData: (p) => p,
    });
    const [search, setSearch] = useState("");
    const action = useAdminAction(token);
    const [clearing, setClearing] = useState(null);
    const [picked, setPicked] = useState([]);
    const openClear = (c) => {
        setClearing(c);
        setPicked(c.stations.filter((s) => s.recorded).map((s) => s.station));
    };
    const rows = useMemo(() => {
        const s = search.trim().toLowerCase();
        const all = q.data?.rows ?? [];
        return s ? all.filter((r) => r.examNumber.toLowerCase().includes(s) || r.fullName.toLowerCase().includes(s)) : all;
    }, [q.data, search]);
    if (!q.data) {
        return q.isError ? <p>{q.error.message}</p> : <Skeleton style={{ height: 300 }}/>;
    }
    const r = q.data;
    const cell = (v) => (v === null ? <span className={styles.dash}>–</span> : v);
    return (<section className={styles.card}>
      <div className={styles.toolbar}>
        <div className={styles.search}>
          <Search size={16}/>
          <Input placeholder="Search results" value={search} onChange={(e) => setSearch(e.target.value)}/>
        </div>
        <div className={styles.meta}>
          Maximum total <strong>{r.maxTotal}</strong>
        </div>
        <Button onClick={() => exportCsv(r)} disabled={r.rows.length === 0}>
          <Download size={16}/> Export results (CSV)
        </Button>
      </div>
      <div className={styles.scroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Exam no.</th>
              <th>Name</th>
              {r.stations.map((s) => (<th key={s.number} className={styles.num} title={s.title}>
                  S{s.number}
                  <small>{s.kind === "procedure" ? "proc" : "cbt"} /{s.maxScore}</small>
                </th>))}
              <th className={styles.num}>
                Project<small>/{r.componentMax.project}</small>
              </th>
              <th className={styles.num}>
                Viva<small>/{r.componentMax.viva}</small>
              </th>
              <th className={styles.num}>
                Client care<small>/{r.componentMax.clientCare}</small>
              </th>
              <th className={styles.num}>
                Total<small>/{r.maxTotal}</small>
              </th>
              <th className={styles.num}>%</th>
              <th className={styles.adminCol} aria-label="Admin actions"/>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (<tr key={c.candidateId}>
                <td className={styles.mono}>{c.examNumber}</td>
                <td className={styles.name}>{c.fullName}</td>
                {c.stations.map((s) => (<td key={s.station} className={styles.num}>
                    {s.recorded ? s.score : <span className={styles.dash}>–</span>}
                  </td>))}
                <td className={styles.num}>{cell(c.project)}</td>
                <td className={styles.num}>{cell(c.viva)}</td>
                <td className={styles.num}>{cell(c.clientCare)}</td>
                <td className={`${styles.num} ${styles.total}`}>{c.total}</td>
                <td className={styles.num}>{c.percentage}</td>
                <td className={styles.adminCol}>
                  <Button variant="ghost" size="sm" title="Clear a wrong submission so the candidate can retake" disabled={!c.stations.some((s) => s.recorded)} onClick={() => openClear(c)}>
                    <RotateCcw size={14}/> Clear
                  </Button>
                </td>
              </tr>))}
            {rows.length === 0 ? (<tr>
                <td colSpan={14} className={styles.empty}>
                  No results yet.
                </td>
              </tr>) : null}
          </tbody>
        </table>
      </div>
      <p className={styles.note}>
        “–” means nothing recorded yet. Results update live. The “Clear” column is for the control room only and is not
        part of the CSV export.
      </p>

      <Dialog open={!!clearing} onOpenChange={(o) => !o && setClearing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear submission — {clearing?.examNumber}</DialogTitle>
            <DialogDescription>
              For a wrong submission. The selected stations' answers or checklist marks are deleted and their timers
              reset, so {clearing?.fullName} can retake them. Project, viva and client care marks are not affected.
            </DialogDescription>
          </DialogHeader>
          {clearing ? (<div className={styles.clearList}>
              {clearing.stations.map((s) => {
                const st = r.stations.find((x) => x.number === s.station);
                return (<label key={s.station} className={styles.clearRow}>
                    <Checkbox checked={picked.includes(s.station)} disabled={!s.recorded} onChange={(e) => setPicked((p) => (e.target.checked ? [...p, s.station] : p.filter((n) => n !== s.station)))}/>
                    <span>
                      Station {s.station} · {st?.kind === "procedure" ? "Procedure" : "Questions"}
                    </span>
                    <span className={styles.clearScore}>{s.recorded ? `${s.score}/${st?.maxScore ?? ""}` : "nothing recorded"}</span>
                  </label>);
            })}
            </div>) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setClearing(null)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={picked.length === 0 || action.isPending} onClick={() => clearing &&
            action.mutate({ action: "clearSubmission", candidateId: clearing.candidateId, stations: picked }, { onSuccess: () => setClearing(null) })}>
              Clear {picked.length} station{picked.length === 1 ? "" : "s"} for retake
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>);
};
