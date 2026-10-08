import { useEffect, useState } from "react";
import { Pencil, Trash2, Plus } from "lucide-react";
import { Button } from "./Button";
import { Input } from "./Input";
import { Textarea } from "./Textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./Select";
import { CsvImport } from "./CsvImport";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "./Dialog";
import { useAdminAction } from "../helpers/useAdminAction";
import styles from "./AdminContentPanel.module.css";
/** Checklist CSV for ONE procedure station: description, max_score. */
const mapChecklistFor = (station) => (records) => {
    const rows = [];
    const errors = [];
    records.forEach((r, i) => {
        const fileStation = r.station || r.station_number;
        const description = r.description || r.item || r.step || "";
        const rawMax = r.max_score ?? r.marks ?? "";
        const maxScore = rawMax === "" ? 1 : Number(rawMax);
        if (fileStation && Number(fileStation) !== station)
            errors.push(`Line ${i + 2}: row is for station ${fileStation}, not station ${station}`);
        else if (!description)
            errors.push(`Line ${i + 2}: description is empty`);
        else if (!Number.isFinite(maxScore) || maxScore < 0)
            errors.push(`Line ${i + 2}: max_score must be a number`);
        else
            rows.push({ stationNumber: station, description, maxScore });
    });
    return { rows, errors };
};
/** Question CSV for ONE question station: question, option_a..option_e, correct_option, marks. */
const mapQuestionsFor = (station) => (records) => {
    const rows = [];
    const errors = [];
    records.forEach((r, i) => {
        const fileStation = r.station || r.station_number;
        const q = r.question || r.question_text || "";
        const correct = (r.correct_option || r.answer || r.correct_answer || "").toUpperCase().trim();
        const opts = { A: r.option_a, B: r.option_b, C: r.option_c, D: r.option_d, E: r.option_e };
        const marks = r.marks === undefined || r.marks === "" ? 1 : Number(r.marks);
        if (fileStation && Number(fileStation) !== station)
            errors.push(`Line ${i + 2}: row is for station ${fileStation}, not station ${station}`);
        else if (!q)
            errors.push(`Line ${i + 2}: question is empty`);
        else if (!opts.A || !opts.B)
            errors.push(`Line ${i + 2}: option_a and option_b are required`);
        else if (!["A", "B", "C", "D", "E"].includes(correct) || !opts[correct])
            errors.push(`Line ${i + 2}: correct_option must be a letter with a filled option`);
        else if (!Number.isFinite(marks) || marks < 0)
            errors.push(`Line ${i + 2}: marks must be a number`);
        else
            rows.push({
                stationNumber: station,
                questionText: q,
                optionA: opts.A,
                optionB: opts.B,
                optionC: opts.C || null,
                optionD: opts.D || null,
                optionE: opts.E || null,
                correctOption: correct,
                marks,
            });
    });
    return { rows, errors };
};
const CHECKLIST_SAMPLES = {
    1: [
        ["Introduces self and obtains consent", "1"],
        ["Performs hand hygiene", "1"],
        ["Positions the patient correctly", "2"],
    ],
    3: [
        ["Prepares a sterile field", "2"],
        ["Cleans wound from least to most contaminated area", "3"],
    ],
    5: [
        ["Checks the five rights of medication", "2"],
        ["Calculates the dosage correctly", "3"],
    ],
};
function StationEditor({ station, token }) {
    const action = useAdminAction(token);
    const [title, setTitle] = useState(station.title);
    const [instructions, setInstructions] = useState(station.instructions ?? "");
    const [minutes, setMinutes] = useState(String(station.durationMinutes));
    useEffect(() => setTitle(station.title), [station.title]);
    useEffect(() => setInstructions(station.instructions ?? ""), [station.instructions]);
    useEffect(() => setMinutes(String(station.durationMinutes)), [station.durationMinutes]);
    const mins = parseInt(minutes, 10);
    const minsValid = Number.isFinite(mins) && mins >= 1 && mins <= 600;
    const dirty = title !== station.title || instructions !== (station.instructions ?? "") || mins !== station.durationMinutes;
    return (<div className={styles.stationEdit}>
      <div className={styles.titleRow}>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Station title"/>
        <label className={styles.minutes}>
          <Input type="number" min={1} max={600} value={minutes} onChange={(e) => setMinutes(e.target.value)} aria-label="Time allocation in minutes"/>
          <span>min</span>
        </label>
      </div>
      <span className={styles.minutesHint}>
        {station.kind === "procedure"
            ? "Time per candidate — the examiner starts it; marks auto-submit when it ends."
            : "Time per candidate — starts when the candidate opens the station; answers auto-submit when it ends."}
      </span>
      <Textarea rows={2} value={instructions} placeholder={station.kind === "procedure" ? "Scenario / instructions for the examiner" : "Instructions shown to candidates"} onChange={(e) => setInstructions(e.target.value)}/>
      {dirty ? (<Button size="sm" variant="secondary" disabled={!title.trim() || !minsValid || action.isPending} onClick={() => action.mutate({
                action: "updateStation",
                number: station.number,
                title,
                instructions: instructions || null,
                durationMinutes: mins,
            })}>
          Save station details
        </Button>) : null}
    </div>);
}
const emptyQuestion = (st) => ({
    stationNumber: st,
    questionText: "",
    optionA: "",
    optionB: "",
    optionC: "",
    optionD: "",
    optionE: "",
    correctOption: "A",
    marks: 1,
});
export const AdminContentPanel = ({ token, data }) => {
    const action = useAdminAction(token);
    const [item, setItem] = useState(null);
    const [question, setQuestion] = useState(null);
    const itemsFor = (n) => data.checklist.filter((c) => c.stationNumber === n);
    const questionsFor = (n) => data.questions.filter((q) => q.stationNumber === n);
    return (<div className={styles.wrap}>
      <div className={styles.stations}>
        {data.stations.map((s) => {
            const isProc = s.kind === "procedure";
            const items = isProc ? itemsFor(s.number) : [];
            const qs = isProc ? [] : questionsFor(s.number);
            const total = isProc ? items.reduce((a, b) => a + b.maxScore, 0) : qs.reduce((a, b) => a + b.marks, 0);
            return (<section key={s.number} className={styles.station}>
              <header className={styles.stationHead}>
                <span className={styles.stationNo}>{s.number}</span>
                <div className={styles.stationMeta}>
                  <span className={styles.kind}>{isProc ? "Procedure station" : "Question station"}</span>
                  <span className={styles.count}>
                    {isProc ? `${items.length} items` : `${qs.length} questions`} · {total} marks · {s.durationMinutes} min
                  </span>
                </div>
                <Button size="sm" variant="outline" onClick={() => isProc
                    ? setItem({ stationNumber: s.number, description: "", maxScore: 1 })
                    : setQuestion(emptyQuestion(s.number))}>
                  <Plus size={14}/> Add
                </Button>
              </header>
              <StationEditor station={s} token={token}/>
              <div className={styles.stationImport}>
                {isProc ? (<CsvImport title={`Station ${s.number} checklist CSV`} description="One row per checklist step for this station only." templateName={`station_${s.number}_checklist_template.csv`} templateHeaders={["description", "max_score"]} templateSample={CHECKLIST_SAMPLES[s.number] ?? CHECKLIST_SAMPLES[1]} mapRows={mapChecklistFor(s.number)} replaceHint={`clears station ${s.number}'s checklist and its marks`} onImport={(rows, mode) => action.mutateAsync({ action: "importChecklist", rows, mode })}/>) : (<CsvImport title={`Station ${s.number} questions CSV`} description="Multiple choice, 2–5 options, for this station only." templateName={`station_${s.number}_questions_template.csv`} templateHeaders={["question", "option_a", "option_b", "option_c", "option_d", "option_e", "correct_option", "marks"]} templateSample={[
                        ["Normal adult respiratory rate per minute is:", "8-10", "12-20", "22-28", "30-40", "", "B", "1"],
                        ["The first step in infection prevention is:", "Wearing gloves", "Hand hygiene", "Using a mask", "Isolation", "", "B", "1"],
                    ]} mapRows={mapQuestionsFor(s.number)} replaceHint={`clears station ${s.number}'s questions and answers to them`} onImport={(rows, mode) => action.mutateAsync({ action: "importQuestions", rows, mode })}/>)}
              </div>
              <ol className={styles.items}>
                {isProc
                    ? items.map((it, i) => (<li key={it.id} className={styles.itemRow}>
                        <span className={styles.itemNo}>{i + 1}</span>
                        <span className={styles.itemText}>{it.description}</span>
                        <span className={styles.itemMarks}>{it.maxScore}</span>
                        <span className={styles.itemActions}>
                          <Button variant="ghost" size="icon-sm" title="Edit" onClick={() => setItem({ id: it.id, stationNumber: it.stationNumber, description: it.description, maxScore: it.maxScore })}>
                            <Pencil size={13}/>
                          </Button>
                          <Button variant="ghost" size="icon-sm" title="Delete" onClick={() => action.mutate({ action: "deleteChecklistItem", id: it.id })}>
                            <Trash2 size={13}/>
                          </Button>
                        </span>
                      </li>))
                    : qs.map((q, i) => (<li key={q.id} className={styles.itemRow}>
                        <span className={styles.itemNo}>{i + 1}</span>
                        <span className={styles.itemText}>
                          {q.questionText}
                          <span className={styles.answerKey}>Key: {q.correctOption}</span>
                        </span>
                        <span className={styles.itemMarks}>{q.marks}</span>
                        <span className={styles.itemActions}>
                          <Button variant="ghost" size="icon-sm" title="Edit" onClick={() => setQuestion({
                            id: q.id,
                            stationNumber: q.stationNumber,
                            questionText: q.questionText,
                            optionA: q.optionA,
                            optionB: q.optionB,
                            optionC: q.optionC ?? "",
                            optionD: q.optionD ?? "",
                            optionE: q.optionE ?? "",
                            correctOption: q.correctOption,
                            marks: q.marks,
                        })}>
                            <Pencil size={13}/>
                          </Button>
                          <Button variant="ghost" size="icon-sm" title="Delete" onClick={() => action.mutate({ action: "deleteQuestion", id: q.id })}>
                            <Trash2 size={13}/>
                          </Button>
                        </span>
                      </li>))}
                {(isProc ? items.length : qs.length) === 0 ? <li className={styles.emptyRow}>Nothing uploaded yet.</li> : null}
              </ol>
            </section>);
        })}
      </div>

      <Dialog open={!!item} onOpenChange={(o) => !o && setItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{item?.id ? "Edit checklist item" : "Add checklist item"} · Station {item?.stationNumber}</DialogTitle>
          </DialogHeader>
          {item ? (<form className={styles.form} onSubmit={(e) => {
                e.preventDefault();
                const { id, ...row } = item;
                action.mutate({ action: "saveChecklistItem", id, row }, { onSuccess: () => setItem(null) });
            }}>
              <label className={styles.field}>
                <span>Checklist step</span>
                <Textarea required rows={3} value={item.description} onChange={(e) => setItem({ ...item, description: e.target.value })}/>
              </label>
              <label className={styles.field}>
                <span>Maximum score</span>
                <Input type="number" min={0} step="0.25" required value={item.maxScore} onChange={(e) => setItem({ ...item, maxScore: Number(e.target.value) })}/>
              </label>
              <DialogFooter>
                <Button type="submit" disabled={action.isPending}>
                  Save
                </Button>
              </DialogFooter>
            </form>) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={!!question} onOpenChange={(o) => !o && setQuestion(null)}>
        <DialogContent className={styles.wideDialog}>
          <DialogHeader>
            <DialogTitle>{question?.id ? "Edit question" : "Add question"} · Station {question?.stationNumber}</DialogTitle>
          </DialogHeader>
          {question ? (<form className={styles.form} onSubmit={(e) => {
                e.preventDefault();
                const { id, ...row } = question;
                action.mutate({
                    action: "saveQuestion",
                    id,
                    row: { ...row, optionC: row.optionC || null, optionD: row.optionD || null, optionE: row.optionE || null },
                }, { onSuccess: () => setQuestion(null) });
            }}>
              <label className={styles.field}>
                <span>Question</span>
                <Textarea required rows={3} value={question.questionText} onChange={(e) => setQuestion({ ...question, questionText: e.target.value })}/>
              </label>
              {["A", "B", "C", "D", "E"].map((L) => {
                const key = `option${L}`;
                return (<label key={L} className={styles.optRow}>
                    <span className={styles.optLetter}>{L}</span>
                    <Input required={L === "A" || L === "B"} placeholder={L === "A" || L === "B" ? "Required" : "Optional"} value={question[key] ?? ""} onChange={(e) => setQuestion({ ...question, [key]: e.target.value })}/>
                  </label>);
            })}
              <div className={styles.twoCol}>
                <label className={styles.field}>
                  <span>Correct option</span>
                  <Select value={question.correctOption} onValueChange={(v) => setQuestion({ ...question, correctOption: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["A", "B", "C", "D", "E"].map((L) => (<SelectItem key={L} value={L}>
                          {L}
                        </SelectItem>))}
                    </SelectContent>
                  </Select>
                </label>
                <label className={styles.field}>
                  <span>Marks</span>
                  <Input type="number" min={0} step="0.5" value={question.marks} onChange={(e) => setQuestion({ ...question, marks: Number(e.target.value) })}/>
                </label>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={action.isPending}>
                  Save question
                </Button>
              </DialogFooter>
            </form>) : null}
        </DialogContent>
      </Dialog>
    </div>);
};
