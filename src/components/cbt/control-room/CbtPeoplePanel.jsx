import { useMemo, useState } from "react";
import { Search, Plus, Pencil, Trash2, Printer, Undo2 } from "lucide-react";
import { Button } from "../../shared/ui/actions/Button";
import { Input } from "../../shared/ui/forms/Input";
import { Badge } from "../../shared/ui/feedback/Badge";
import { CsvImport } from "../../shared/ui/forms/CsvImport";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../../shared/ui/overlays/Dialog";
import styles from "../../osce/control-room/AdminPeoplePanel.module.css";

const parseCandidate = records => {
  const rows = [], errors = [];
  records.forEach((r, i) => {
    const examNumber = r.exam_number || r.exam_no || r.matric_number || r.reg_number;
    const fullName = r.full_name || r.name;
    if (!examNumber || !fullName) errors.push(`Line ${i + 2}: missing examination number or full name`);
    else rows.push({ examNumber, fullName, pin:r.pin });
  });
  return {rows,errors};
};
const parseExaminer = records => {
  const rows=[], errors=[];
  records.forEach((r,i)=>{ if (!r.username || !(r.full_name || r.name)) errors.push(`Line ${i+2}: missing username or name`);
    else rows.push({username:r.username, fullName:r.full_name || r.name, pin:r.pin}); });
  return {rows,errors};
};

export function CbtCandidatesPanel({ data, action, busy }) {
  const [search,setSearch] = useState("");
  const [editing,setEditing] = useState(null);
  const [deleting,setDeleting] = useState(null);
  const [reopening,setReopening] = useState(null);
  const [reviewing,setReviewing] = useState(null);
  const list = useMemo(() => data.candidates.filter(c => (c.examNumber+" "+c.fullName).toLowerCase().includes(search.trim().toLowerCase())),[data.candidates,search]);
  const printSlips = () => {
    const popup = window.open("", "_blank");
    if (!popup) return;
    const escape = v => String(v ?? "").replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
    popup.document.write(`<html><head><title>CBT candidate login slips</title><style>body{font-family:sans-serif}.slip{display:inline-block;width:43%;margin:8px;padding:12px;border:1px dashed #999}</style></head><body>${data.candidates.map(c=>`<div class="slip"><b>${escape(data.settings.institutionName)}</b><br>CBT — ${escape(c.fullName)}<br>Exam no: ${escape(c.examNumber)}<br>PIN: ${escape(c.pin)}</div>`).join("")}</body></html>`);
    popup.document.close(); popup.print();
  };
  return <div className={styles.wrap}>
    <CsvImport title="Upload CBT candidates" description="One row per CBT candidate. Leave PIN blank for auto-generation." templateName="cbt_candidates_template.csv" templateHeaders={["exam_number","full_name","pin"]} templateSample={[["CBT/001","Aisha Musa","4821"]]} mapRows={parseCandidate} replaceHint="deletes only CBT candidates and their CBT attempts/answers" onImport={async(rows,mode)=>{const ok=await action({action:"importCandidates",rows,mode});if(!ok)throw Error("CBT candidate import failed");}}/>
    <section className={styles.tableCard}>
      <div className={styles.toolbar}><div className={styles.search}><Search size={16}/><Input placeholder="Search CBT candidates" value={search} onChange={e=>setSearch(e.target.value)}/></div>
        <div className={styles.toolbarBtns}><Button variant="outline" size="sm" disabled={!data.candidates.length} onClick={printSlips}><Printer size={14}/> Print login slips</Button><Button size="sm" onClick={()=>setEditing({examNumber:"",fullName:"",pin:""})}><Plus size={14}/> Add candidate</Button></div></div>
      <div className={styles.tableScroll}><table className={styles.table}><thead><tr><th>Exam no.</th><th>Name</th><th>PIN</th><th>Answered</th><th>Station</th><th>Status</th><th/></tr></thead><tbody>
      {list.map(c=>{ const attempt = c.attempts?.[1]; const st = attempt?.status || "not_started";
        return <tr key={c.id}><td className={styles.mono}>{c.examNumber}</td><td>{c.fullName}</td><td className={styles.mono}>{c.pin}</td><td className={styles.mono}>{c.answeredCount}/{data.questions.length}</td>
          <td><div className={styles.chips}><button type="button" className={`${styles.chip} ${st === "submitted" ? styles.chipDone : st === "in_progress" ? styles.chipLive : ""}`} title={`CBT Station 1: ${st}. Click to inspect or re-open.`} disabled={st === "not_started"} onClick={()=>setReopening(c)}>1</button></div></td>
          <td>{c.security?.count > 0 && <button type="button" style={{border:0,background:"transparent",padding:0,cursor:"pointer"}} onClick={()=>setReviewing(c)} title="Review security history"><Badge variant="destructive">Warnings {c.security.count}/3</Badge></button>} <Badge variant={st === "submitted" ? "success" : "outline"}>{c.security?.locked ? "Security locked" : st.replace(/_/g," ")}</Badge></td>
          <td className={styles.rowActions}>
            {c.security?.count > 0 && <Button variant="outline" size="sm" disabled={busy} title="Clear warnings after incident review" onClick={async()=>{ if(window.confirm(`Clear security warnings for ${c.fullName}? The audit trail will remain.`)) await action({action:"resetSecurityWarnings",candidateId:c.id}); }}>Clear warnings</Button>}
            {st === "submitted" && <Button variant="ghost" size="icon-sm" title="Re-open CBT" onClick={()=>setReopening(c)}><Undo2 size={14}/></Button>}
            <Button variant="ghost" size="icon-sm" title="Edit" onClick={()=>setEditing({...c})}><Pencil size={14}/></Button>
            <Button variant="ghost" size="icon-sm" title="Delete" onClick={()=>setDeleting(c)}><Trash2 size={14}/></Button>
          </td></tr>;})}
      {!list.length && <tr><td colSpan={7} className={styles.empty}>{data.candidates.length ? "No match" : "No CBT candidates yet"}</td></tr>}
      </tbody></table></div>
    </section>
    <Dialog open={!!editing} onOpenChange={v=>!v&&setEditing(null)}><DialogContent><DialogHeader><DialogTitle>{editing?.id ? "Edit CBT candidate" : "Add CBT candidate"}</DialogTitle></DialogHeader>
      {editing && <form className={styles.form} onSubmit={async e=>{ e.preventDefault(); const ok=await action({action:"saveCandidate",id:editing.id,row:{examNumber:editing.examNumber,fullName:editing.fullName,pin:editing.pin}}); if(ok)setEditing(null); }}>
        {[["examNumber","Exam number"],["fullName","Full name"],["pin","PIN (blank = generate)"]].map(([key,label])=><label key={key} className={styles.field}><span>{label}</span><Input required={key!=="pin"} value={editing[key]||""} onChange={e=>setEditing({...editing,[key]:e.target.value})}/></label>)}
        <DialogFooter><Button type="submit" disabled={busy}>Save candidate</Button></DialogFooter></form>}
    </DialogContent></Dialog>
    <Dialog open={!!deleting} onOpenChange={v=>!v&&setDeleting(null)}><DialogContent><DialogHeader><DialogTitle>Delete {deleting?.fullName}?</DialogTitle><DialogDescription>Only this CBT account and its CBT attempts and answers will be deleted.</DialogDescription></DialogHeader><DialogFooter>
      <Button variant="outline" onClick={()=>setDeleting(null)}>Cancel</Button><Button variant="destructive" disabled={busy} onClick={async()=>{const ok=await action({action:"deleteCandidate",id:deleting.id});if(ok)setDeleting(null);}}>Delete</Button>
    </DialogFooter></DialogContent></Dialog>
    <Dialog open={!!reviewing} onOpenChange={v=>!v&&setReviewing(null)}><DialogContent>
      <DialogHeader><DialogTitle>Security history — {reviewing?.fullName}</DialogTitle><DialogDescription>Browser interruptions are not proof of malpractice. Review before clearing warnings.</DialogDescription></DialogHeader>
      <div style={{maxHeight:300,overflowY:"auto",fontSize:13}}>{(data.securityIncidents?.find(i=>i.candidateId===reviewing?.id)?.events || []).map((e,i)=><p key={e.id||i} style={{padding:"8px 0",borderBottom:"1px solid #e2e8f0"}}><strong>{e.type?.replace(/_/g," ")}</strong> — {e.receivedAt?new Date(e.receivedAt).toLocaleString():"Unknown time"}{e.counted?" · Counted":" · Not counted"}</p>)}</div>
      <DialogFooter><Button variant="outline" onClick={()=>setReviewing(null)}>Close</Button><Button disabled={busy} onClick={async()=>{if(reviewing && await action({action:"resetSecurityWarnings",candidateId:reviewing.id}))setReviewing(null);}}>Clear warning count</Button></DialogFooter>
    </DialogContent></Dialog>
    <Dialog open={!!reopening} onOpenChange={v=>!v&&setReopening(null)}><DialogContent><DialogHeader><DialogTitle>Station 1 — {reopening?.fullName}</DialogTitle><DialogDescription>
      CBT contains one station. Re-opening resets this candidate's timer and submission status while keeping their saved answers. The examination period must be running.
    </DialogDescription></DialogHeader>
      {reopening && <div><p>Attempt: <strong>{reopening.attempts?.[1]?.status?.replace(/_/g," ")}</strong></p><p>Answered: {reopening.answeredCount}/{data.questions.length}</p>
        <p>Started: {reopening.attempts?.[1]?.startedAt ? new Date(reopening.attempts[1].startedAt).toLocaleString() : "Not started"}</p>
        <p>Ended: {reopening.attempts?.[1]?.submittedAt ? new Date(reopening.attempts[1].submittedAt).toLocaleString() : "—"}</p></div>}
      <div className={styles.extendBtns}>{[2,5,10].map(minutes=><Button key={minutes} variant="secondary" size="sm" disabled={busy || data.settings.examStatus!=="running" || reopening?.attempts?.[1]?.status !== "in_progress"} onClick={async()=>{const ok=await action({action:"extendStationAttempt",candidateId:reopening.id,stationNumber:1,minutes});if(ok)setReopening(null);}}>+{minutes} min</Button>)}</div>
      <DialogFooter><Button variant="outline" onClick={()=>setReopening(null)}>Cancel</Button><Button disabled={busy || data.settings.examStatus!=="running"} onClick={async()=>{const ok=await action({action:"resetStationAttempt",candidateId:reopening.id,stationNumber:1});if(ok)setReopening(null);}}>Re-open Station 1</Button></DialogFooter>
    </DialogContent></Dialog>
  </div>;
}

export function CbtExaminersPanel({data,action,busy}) {
  const [editing,setEditing] = useState(null), [deleting,setDeleting] = useState(null);
  return <div className={styles.wrap}>
    <section className={styles.stationBoard}><div className={styles.boardCell}><div className={styles.boardHead}><span className={styles.boardNo}>1</span><span className={styles.boardKind}>CBT · question station</span><span className={styles.boardCount}>{data.examiners.length} examiners</span></div>
      <ul className={styles.boardList}>{data.examiners.map(e=><li key={e.id}><button className={styles.boardName} onClick={()=>setEditing({...e})}>{e.fullName}</button></li>)}</ul>
      <Button variant="outline" size="sm" onClick={()=>setEditing({username:"",fullName:"",pin:""})}><Plus size={14}/> Add to Station 1</Button>
    </div></section>
    <CsvImport title="Upload CBT examiners" description="Upload CBT examiner usernames and PINs." templateName="cbt_examiners_template.csv" templateHeaders={["username","full_name","pin"]} templateSample={[["cbt-examiner-1","Dr. Ali","1456"]]} mapRows={parseExaminer} replaceHint="removes only CBT examiner accounts" onImport={async(rows,mode)=>{const ok=await action({action:"importExaminers",rows,mode});if(!ok)throw Error("CBT examiner import failed");}}/>
    <section className={styles.tableCard}><div className={styles.toolbar}><p className={styles.note}>CBT examiners monitor the single station; objective questions are marked automatically on the server.</p><Button size="sm" onClick={()=>setEditing({username:"",fullName:"",pin:""})}><Plus size={14}/> Add examiner</Button></div>
      <div className={styles.tableScroll}><table className={styles.table}><thead><tr><th>Name</th><th>Username</th><th>PIN</th><th>Station</th><th>Access</th><th/></tr></thead><tbody>
        {data.examiners.map(e=><tr key={e.id}><td>{e.fullName}</td><td className={styles.mono}>{e.username}</td><td className={styles.mono}>{e.pin}</td><td>Station 1 · Questions</td><td><Badge variant="secondary">View results</Badge></td><td className={styles.rowActions}><Button variant="ghost" size="icon-sm" onClick={()=>setEditing({...e})}><Pencil size={14}/></Button><Button variant="ghost" size="icon-sm" onClick={()=>setDeleting(e)}><Trash2 size={14}/></Button></td></tr>)}
        {!data.examiners.length&&<tr><td colSpan={6} className={styles.empty}>No CBT examiners</td></tr>}
      </tbody></table></div>
    </section>
    <Dialog open={!!editing} onOpenChange={v=>!v&&setEditing(null)}><DialogContent><DialogHeader><DialogTitle>{editing?.id ? "Edit CBT examiner" : "Add CBT examiner"}</DialogTitle></DialogHeader>
      {editing&&<form className={styles.form} onSubmit={async e=>{e.preventDefault();const ok=await action({action:"saveExaminer",...editing});if(ok)setEditing(null);}}>
        {[["fullName","Full name"],["username","Username"],["pin","PIN (blank = generate)"]].map(([key,label])=><label key={key} className={styles.field}><span>{label}</span><Input required={key!=="pin"} value={editing[key]||""} onChange={e=>setEditing({...editing,[key]:e.target.value})}/></label>)}
        <DialogFooter><Button type="submit" disabled={busy}>Save examiner</Button></DialogFooter>
      </form>}
    </DialogContent></Dialog>
    <Dialog open={!!deleting} onOpenChange={v=>!v&&setDeleting(null)}><DialogContent><DialogHeader><DialogTitle>Remove {deleting?.fullName}?</DialogTitle><DialogDescription>Only this CBT examiner account will be removed.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={()=>setDeleting(null)}>Cancel</Button><Button variant="destructive" disabled={busy} onClick={async()=>{const ok=await action({action:"deleteExaminer",id:deleting.id});if(ok)setDeleting(null);}}>Remove</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}
