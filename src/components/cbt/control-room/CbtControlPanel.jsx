import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Play, Square, RotateCcw, Eye, EyeOff, ExternalLink, ImageUp, Trash2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { FileDropzone } from "../../shared/ui/forms/FileDropzone";
import { Button } from "../../shared/ui/actions/Button";
import { Input } from "../../shared/ui/forms/Input";
import { Badge } from "../../shared/ui/feedback/Badge";
import { ExamTimer } from "../../shared/examination/ExamHeader";
import { useExamClock } from "../../../helpers/useExamClock";
import styles from "../../osce/control-room/AdminControlPanel.module.css";

async function toLogoDataUrl(file) {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve,reject)=>{
      const value = new Image(); value.onload=()=>resolve(value); value.onerror=()=>reject(Error("Unsupported image.")); value.src=objectUrl;
    });
    const scale = Math.min(1, 320/Math.max(img.width,img.height));
    const canvas = document.createElement("canvas");
    canvas.width=Math.max(1,Math.round(img.width*scale)); canvas.height=Math.max(1,Math.round(img.height*scale));
    canvas.getContext("2d").drawImage(img,0,0,canvas.width,canvas.height);
    return canvas.toDataURL("image/png");
  } finally {URL.revokeObjectURL(objectUrl);}
}
export default function CbtControlPanel({ data, action, busy }) {
  const s = data.settings;
  const clock = useExamClock(s);
  const [newPassword,setNewPassword] = useState("");
  const [clearResponses,setClearResponses] = useState(false);
  const [institutionName, setInstitution] = useState(s.institutionName || "");
  const [examTitle, setTitle] = useState(s.examTitle || "");
  const [durationMinutes, setDuration] = useState(s.durationMinutes || 60);
  const [instructions, setInstructions] = useState(s.instructions || "");
  useEffect(() => { setInstitution(s.institutionName || ""); setTitle(s.examTitle || "");
    setDuration(s.durationMinutes || 60); setInstructions(s.instructions || ""); }, [s.institutionName, s.examTitle, s.durationMinutes, s.instructions]);
  const running = clock.status === "running";
  const submitted = data.candidates.filter(c => c.attempts?.[1]?.status === "submitted").length;
  const confirmAction = (message, payload) => { if (window.confirm(message)) action(payload); };
  return <div className={styles.grid}>
    <section className={`${styles.card} ${styles.wide}`}>
      <div className={styles.cardHead}><h2>Exam period</h2><Badge variant={running ? "success" : clock.status === "ended" ? "destructive" : "outline"}>{clock.status === "not_started" ? "Not started" : running ? "Running" : "Ended"}</Badge></div>
      <div className={styles.clockRow}>
        <ExamTimer clock={clock} className={styles.bigTimer}/>
        <div className={styles.stats}>
          <div><span className={styles.statNo}>{data.candidates.length}</span> candidates</div>
          <div><span className={styles.statNo}>{submitted}</span> submitted</div>
          <div><span className={styles.statNo}>{data.questions.length}</span> questions</div>
          <div><span className={styles.statNo}>1</span> station</div>
        </div>
      </div>
      <div className={styles.btnRow}>
        <Button disabled={busy || running} onClick={() => action({action:"startExam"})}><Play size={16}/>{clock.status === "ended" ? "Re-open exam" : "Start exam"}</Button>
        <Button variant="destructive" disabled={busy || !running} onClick={() => confirmAction("End the CBT examination period now?", {action:"endExam"})}><Square size={16}/> End exam now</Button>
        <Button variant="ghost" disabled={busy || running} onClick={() => confirmAction(clearResponses ? "Delete current CBT sitting answers and attempts, then start a new sitting? This cannot be undone." : "Start a NEW CBT sitting? Existing answers remain saved for audit.", {action:"resetExam",clearResponses})}><RotateCcw size={16}/> Reset / new sitting</Button>
      </div>
      <div className={styles.accessRow}>
        {[["candidateAccessOpen", "Candidate exam"], ["examinerAccessOpen", "Examiner exam"]].map(([key,label]) => {
          const open = s[key] !== false;
          return <div key={key} className={`${styles.accessCard} ${open ? styles.accessOpen : styles.accessHidden}`}>
            <div><div className={styles.accessLabel}>{label}</div><div className={styles.accessState}>{open ? "Open — visible on devices" : "Hidden — devices show closed"}</div></div>
            <Button variant={open ? "outline" : "primary"} disabled={busy} onClick={() => action({action:"updateSettings",[key]:!open})}>
              {open ? <><EyeOff size={16}/> Hide</> : <><Eye size={16}/> Open</>}
            </Button>
          </div>;
        })}
      </div>
      <label className={styles.inlineCheck}><input type="checkbox" checked={clearResponses} onChange={e=>setClearResponses(e.target.checked)}/> Also delete the current CBT sitting's candidate answers on Reset</label>
      <p className={styles.hint}>CBT has one station with multiple subjects. Candidate attempts and marks are managed under Candidates; clicking Station 1 lets you re-open the candidate examination or extend their remaining time. The total exam period is time-limited. Re-open the exam period before re-opening individual candidates after it ends.</p>
    </section>
    <section className={styles.card}>
      <div className={styles.cardHead}><h2>Institution</h2></div>
      <label className={styles.field}><span>Institution name</span><Input value={institutionName} onChange={e => setInstitution(e.target.value)} /></label>
      <label className={styles.field}><span>Examination title</span><Input value={examTitle} onChange={e => setTitle(e.target.value)} /></label>
      <Button variant="secondary" disabled={busy || s.examStatus !== "not_started" || !institutionName.trim() || !examTitle.trim()} onClick={() => action({action:"updateSettings",institutionName,examTitle})}>Save names</Button>
      <div className={styles.logoRow}>
        {s.logoUrl ? <img src={s.logoUrl} className={styles.logo} alt="CBT institution logo"/> : <div className={styles.logoEmpty}>No logo</div>}
        <div className={styles.logoActions}>
          <FileDropzone accept="image/*" maxSize={8*1024*1024} icon={<ImageUp size={22}/>} title="Upload logo" subtitle="PNG or JPG" onFilesSelected={async files=>{
            if(s.examStatus !== "not_started")return toast.error("Reset the CBT examination before changing the logo.");
            try {const logoUrl=await toLogoDataUrl(files[0]);await action({action:"updateSettings",logoUrl});} catch(error){toast.error(error.message);}
          }}/>
          {s.logoUrl && <Button variant="ghost" size="sm" disabled={busy||s.examStatus!=="not_started"} onClick={()=>action({action:"updateSettings",logoUrl:null})}><Trash2 size={14}/> Remove logo</Button>}
        </div>
      </div>
    </section>
    <section className={styles.card}>
      <div className={styles.cardHead}><h2>CBT examination settings</h2></div>
      <label className={styles.field}><span>Duration (minutes)</span><Input type="number" min="1" max="1440" value={durationMinutes} onChange={e => setDuration(Number(e.target.value))}/></label>
      <label className={styles.field}><span>Candidate instructions</span><textarea rows={4} value={instructions} style={{width:"100%",padding:"0.75rem",border:"1px solid var(--border)",borderRadius:"var(--radius)"}} onChange={e => setInstructions(e.target.value)}/></label>
      <Button variant="secondary" disabled={busy || s.examStatus !== "not_started" || !Number.isInteger(Number(durationMinutes))} onClick={() => action({action:"updateSettings",durationMinutes:Number(durationMinutes),instructions})}>Save examination settings</Button>
      <p className={styles.hint}>Changes to the paper and examination duration are locked once a sitting begins. End and reset first.</p>
    </section>
    <section className={styles.card}>
      <div className={styles.cardHead}><h2>Administrator password</h2></div>
      <label className={styles.field}><span>New CBT administrator password</span><Input type="password" autoComplete="new-password" value={newPassword} onChange={e=>setNewPassword(e.target.value)}/></label>
      <Button variant="secondary" disabled={busy||newPassword.length<6} onClick={async()=>{const ok=await action({action:"changePassword",newPassword});if(ok)setNewPassword("");}}>Change password</Button>
      <p className={styles.hint}>Only changes the CBT administrator password, not OSCE.</p>
    </section>
    <section className={`${styles.card} ${styles.wide}`}>
      <div className={styles.cardHead}><h2>Examination device links</h2></div>
      <div className={styles.links}>
        {[["Candidate devices", "/cbt/candidate"],["Examiner devices", "/cbt/examiner"],["OSCE control room", "/admin"]].map(([name, url]) =>
          <div key={url} className={styles.linkCard}><QRCodeSVG size={72} value={`${window.location.origin}${url}`}/><div className={styles.linkText}><strong>{name}</strong><code>{window.location.origin}{url}</code></div><Link to={url} aria-label={`Open ${name}`}><ExternalLink size={18}/></Link></div>)}
      </div>
    </section>
  </div>;
}
