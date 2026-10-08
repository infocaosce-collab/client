import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Play, Square, RotateCcw, Copy, ImageUp, Trash2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "./Button";
import { Input } from "./Input";
import { Badge } from "./Badge";
import { Checkbox } from "./Checkbox";
import { FileDropzone } from "./FileDropzone";
import { ExamTimer } from "./ExamHeader";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, } from "./Dialog";
import { useAdminAction } from "../helpers/useAdminAction";
import { useExamClock } from "../helpers/useExamClock";
import styles from "./AdminControlPanel.module.css";
async function fileToLogoDataUrl(file) {
    const url = URL.createObjectURL(file);
    try {
        const img = await new Promise((resolve, reject) => {
            const i = new Image();
            i.onload = () => resolve(i);
            i.onerror = () => reject(new Error("That file is not a readable image."));
            i.src = url;
        });
        const max = 320;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL("image/png");
    }
    finally {
        URL.revokeObjectURL(url);
    }
}
const statusBadge = {
    not_started: <Badge variant="outline">Not started</Badge>,
    running: <Badge variant="success">Running</Badge>,
    ended: <Badge variant="destructive">Ended</Badge>,
};
export const AdminControlPanel = ({ token, data, liveSettings, className }) => {
    const settings = liveSettings ?? data.settings;
    const clock = useExamClock(settings);
    const action = useAdminAction(token);
    const [duration, setDuration] = useState(String(settings.durationMinutes));
    const [endLabel, setEndLabel] = useState(settings.endButtonLabel);
    const [institution, setInstitution] = useState(settings.institutionName);
    const [examTitle, setExamTitle] = useState(settings.examTitle);
    const [alloc, setAlloc] = useState({
        projectMax: String(settings.projectMax),
        vivaMax: String(settings.vivaMax),
        clientCareMax: String(settings.clientCareMax),
    });
    const [resetOpen, setResetOpen] = useState(false);
    const [clearResponses, setClearResponses] = useState(false);
    const [endOpen, setEndOpen] = useState(false);
    const [newPassword, setNewPassword] = useState("");
    // Keep form fields in step when another admin device changes them.
    useEffect(() => setDuration(String(settings.durationMinutes)), [settings.durationMinutes]);
    useEffect(() => setEndLabel(settings.endButtonLabel), [settings.endButtonLabel]);
    useEffect(() => setInstitution(settings.institutionName), [settings.institutionName]);
    useEffect(() => setExamTitle(settings.examTitle), [settings.examTitle]);
    useEffect(() => setAlloc({
        projectMax: String(settings.projectMax),
        vivaMax: String(settings.vivaMax),
        clientCareMax: String(settings.clientCareMax),
    }), [settings.projectMax, settings.vivaMax, settings.clientCareMax]);
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const links = [
        { label: "Candidate devices", path: "/c" },
        { label: "Examiner devices", path: "/e" },
    ];
    const submitted = data.candidates.filter((c) => c.submittedAt).length;
    return (<div className={`${styles.grid} ${className ?? ""}`}>
      <section className={`${styles.card} ${styles.wide}`}>
        <div className={styles.cardHead}>
          <h2>Exam period</h2>
          {statusBadge[clock.status]}
        </div>
        <div className={styles.clockRow}>
          <ExamTimer clock={clock} className={styles.bigTimer}/>
          <div className={styles.stats}>
            <div>
              <span className={styles.statNo}>{data.candidates.length}</span> candidates
            </div>
            <div>
              <span className={styles.statNo}>{submitted}</span> submitted
            </div>
            <div>
              <span className={styles.statNo}>{data.questions.length}</span> questions
            </div>
            <div>
              <span className={styles.statNo}>{data.checklist.length}</span> checklist items
            </div>
          </div>
        </div>
        <div className={styles.btnRow}>
          <Button onClick={() => action.mutate({ action: "startExam" })} disabled={action.isPending || clock.status === "running"}>
            <Play size={16}/> {clock.status === "ended" ? "Re-open exam" : "Start exam"}
          </Button>
          <Button variant="destructive" disabled={action.isPending || clock.status !== "running"} onClick={() => setEndOpen(true)}>
            <Square size={16}/> End exam now
          </Button>
          <Button variant="ghost" onClick={() => setResetOpen(true)}>
            <RotateCcw size={16}/> Reset
          </Button>
        </div>
        <div className={styles.accessRow}>
          {[
            ["candidateAccessOpen", "Candidate exam"],
            ["examinerAccessOpen", "Examiner exam"],
        ].map(([key, label]) => {
            const open = settings[key];
            return (<div key={key} className={`${styles.accessCard} ${open ? styles.accessOpen : styles.accessHidden}`}>
                <div>
                  <div className={styles.accessLabel}>{label}</div>
                  <div className={styles.accessState}>{open ? "Open — visible on devices" : "Hidden — devices show “closed”"}</div>
                </div>
                <Button variant={open ? "outline" : "primary"} disabled={action.isPending} onClick={() => action.mutate({ action: "updateSettings", [key]: !open })}>
                  {open ? (<>
                      <EyeOff size={16}/> Hide
                    </>) : (<>
                      <Eye size={16}/> Open
                    </>)}
                </Button>
              </div>);
        })}
        </div>
        <div className={styles.formRow}>
          <label className={styles.field}>
            <span>Candidate end-exam button text</span>
            <Input value={endLabel} maxLength={40} onChange={(e) => setEndLabel(e.target.value)}/>
          </label>
          <Button variant="secondary" disabled={action.isPending} onClick={() => action.mutate({ action: "updateSettings", endButtonLabel: endLabel.trim() || "End Exam" })}>
            Save
          </Button>
        </div>
        <p className={styles.hint}>
          The exam period has no countdown: once started it stays open until you press “End exam now”. Timing is per
          station and per candidate (set under “Stations & uploads”); to give one candidate extra time, click their
          station box in the Candidates tab.
        </p>
      </section>

      <section className={styles.card}>
        <div className={styles.cardHead}>
          <h2>Institution</h2>
        </div>
        <label className={styles.field}>
          <span>Institution name</span>
          <Input value={institution} onChange={(e) => setInstitution(e.target.value)}/>
        </label>
        <label className={styles.field}>
          <span>Examination title</span>
          <Input value={examTitle} onChange={(e) => setExamTitle(e.target.value)}/>
        </label>
        <Button variant="secondary" disabled={action.isPending || !institution.trim() || !examTitle.trim()} onClick={() => action.mutate({ action: "updateSettings", institutionName: institution, examTitle })}>
          Save names
        </Button>
        <div className={styles.logoRow}>
          {settings.logoUrl ? (<img src={settings.logoUrl} alt="Institution logo" className={styles.logo}/>) : (<div className={styles.logoEmpty}>No logo</div>)}
          <div className={styles.logoActions}>
            <FileDropzone accept="image/*" maxSize={8 * 1024 * 1024} icon={<ImageUp size={22}/>} title="Upload logo" subtitle="PNG or JPG" onFilesSelected={async (files) => {
            try {
                const logoUrl = await fileToLogoDataUrl(files[0]);
                action.mutate({ action: "updateSettings", logoUrl });
            }
            catch (e) {
                toast.error(e.message);
            }
        }}/>
            {settings.logoUrl ? (<Button variant="ghost" size="sm" onClick={() => action.mutate({ action: "updateSettings", logoUrl: null })}>
                <Trash2 size={14}/> Remove logo
              </Button>) : null}
          </div>
        </div>
      </section>

      <section className={styles.card}>
        <div className={styles.cardHead}>
          <h2>Marks allocation</h2>
        </div>
        <p className={styles.hint}>Maximum marks for the examiner-scored assessments. Examiners see these limits live.</p>
        {[
            ["projectMax", "Project"],
            ["vivaMax", "Viva"],
            ["clientCareMax", "Client care study"],
        ].map(([k, label]) => (<label key={k} className={styles.inlineField}>
            <span>{label}</span>
            <Input type="number" min={0} step="0.5" value={alloc[k]} onChange={(e) => setAlloc((a) => ({ ...a, [k]: e.target.value }))} className={styles.narrow}/>
          </label>))}
        <Button variant="secondary" disabled={action.isPending} onClick={() => {
            const vals = {
                projectMax: Number(alloc.projectMax),
                vivaMax: Number(alloc.vivaMax),
                clientCareMax: Number(alloc.clientCareMax),
            };
            if (Object.values(vals).some((v) => !Number.isFinite(v) || v < 0)) {
                return toast.error("Allocations must be numbers of 0 or more.");
            }
            action.mutate({ action: "updateSettings", ...vals });
        }}>
          Save allocation
        </Button>
        <p className={styles.hint}>Procedure station marks come from each checklist item's maximum score.</p>
      </section>

      <section className={`${styles.card} ${styles.wide}`}>
        <div className={styles.cardHead}>
          <h2>Device links</h2>
        </div>
        <p className={styles.hint}>
          Open these on each device (or scan the code). Use the published app address on exam day.
        </p>
        <div className={styles.links}>
          {links.map((l) => {
            const full = origin + l.path;
            return (<div key={l.path} className={styles.linkCard}>
                <QRCodeSVG value={full} size={112} bgColor="transparent"/>
                <div className={styles.linkText}>
                  <strong>{l.label}</strong>
                  <code className={styles.bigLink}>{full.replace(/^https?:\/\//, "")}</code>
                  <Button variant="outline" size="sm" onClick={() => {
                    navigator.clipboard?.writeText(full).then(() => toast.success("Link copied"), () => toast.error("Copy failed — select the link instead"));
                }}>
                    <Copy size={14}/> Copy link
                  </Button>
                </div>
              </div>);
        })}
        </div>
      </section>

      <section className={styles.card}>
        <div className={styles.cardHead}>
          <h2>Administrator password</h2>
        </div>
        <label className={styles.field}>
          <span>New password</span>
          <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password"/>
        </label>
        <Button variant="secondary" disabled={action.isPending || newPassword.length < 6} onClick={() => action.mutate({ action: "changePassword", newPassword }, { onSuccess: () => setNewPassword("") })}>
          Change password
        </Button>
      </section>

      <Dialog open={endOpen} onOpenChange={setEndOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>End the exam for everyone?</DialogTitle>
            <DialogDescription>
              Every candidate device stops immediately and submits the answers given so far. Examiners can still
              record marks.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEndOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => action.mutate({ action: "endExam" }, { onSettled: () => setEndOpen(false) })}>
              End exam now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset the exam</DialogTitle>
            <DialogDescription>
              Puts the exam back to “not started”. Candidates, questions, checklists and examiners are kept.
            </DialogDescription>
          </DialogHeader>
          <label className={styles.inlineCheck}>
            <Checkbox checked={clearResponses} onChange={(e) => setClearResponses(e.target.checked)}/>
            Also delete all candidate answers and examiner marks
          </label>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => action.mutate({ action: "resetExam", clearResponses }, { onSettled: () => (setResetOpen(false), setClearResponses(false)) })}>
              Reset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>);
};
