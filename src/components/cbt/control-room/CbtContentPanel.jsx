import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "../../shared/ui/actions/Button";
import { Input } from "../../shared/ui/forms/Input";
import { CsvImport } from "../../shared/ui/forms/CsvImport";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../shared/ui/overlays/Dialog";
import styles from "../../osce/control-room/AdminContentPanel.module.css";
import tableStyles from "../../osce/control-room/AdminPeoplePanel.module.css";
import { FlexibleOptionsEditor } from "../../shared/ui/forms/FlexibleOptionsEditor";
import { newOptions, editableOptions, csvQuestionOptions } from "../../../helpers/questionOptions";
const initialQuestion = { id:"", subjectId:"", questionText:"", options:newOptions(), correctOption:"A",marks:1,itemOrder:1 };
const initialSubject = { id:"",title:"",instructions:"",itemOrder:1 };
function importRows(records) {
  const errors=[], rows=[];
  records.forEach((r,i)=>{
    const questionText=r.questiontext || r.question_text || r.question;
    const correctOption=(r.correctoption || r.correct_option || "").toUpperCase();
    let options;
    try { options = csvQuestionOptions(r); }
    catch (err) { errors.push(`Line ${i+2}: ${err.message}`); return; }
    if (!questionText || !correctOption || options.length < 2 || !options.some(o=>o.letter===correctOption))
      errors.push(`Line ${i+2}: enter a question, two options and a matching correct option`);
    else rows.push({questionText,options,correctOption,marks:r.marks || 1});
  });
  return {errors,rows};
}
export default function CbtContentPanel({ data, action, busy }) {
  const locked = data.settings.examStatus !== "not_started";
  const [subject,setSubject] = useState(initialSubject);
  const [question,setQuestion] = useState(null);
  const [subjectDelete,setSubjectDelete] = useState(null);
  const [questionDelete,setQuestionDelete] = useState(null);
  const [importSubject,setImportSubject] = useState("");
  const selectQuestion=q=>setQuestion({...q,options:editableOptions(q)});
  return <div className={styles.wrap}>
    <div className={styles.stations}>
      <section className={styles.station}>
        <div className={styles.stationHead}><span className={styles.stationNo}>1</span><div className={styles.stationMeta}><strong>CBT Examination</strong><span className={styles.kind}>One station · Multiple subjects</span></div><span className={styles.count}>{data.questions.length} questions</span></div>
        <div className={styles.stationEdit}><p>Candidate examinations have exactly one station. Subjects and questions belong to this station.</p><label>Exam duration (minutes)</label><Input type="number" value={data.settings.durationMinutes} readOnly/></div>
      </section>
      <section className={styles.station}>
        <div className={styles.stationHead}><div className={styles.stationMeta}><strong>Subjects</strong><span className={styles.kind}>Manage CBT subjects</span></div></div>
        <div className={styles.stationEdit}>
          <form style={{display:"grid",gap:12,width:"100%"}} onSubmit={async e=>{e.preventDefault();if(await action({action:"saveSubject",...subject}))setSubject(initialSubject);}}>
            <label>Subject name<Input required value={subject.title} onChange={e=>setSubject({...subject,title:e.target.value})}/></label>
            <label>Order<Input type="number" min="1" value={subject.itemOrder} onChange={e=>setSubject({...subject,itemOrder:Number(e.target.value)})}/></label>
            <label>Instructions<textarea rows={2} style={{width:"100%",maxWidth:"100%",minWidth:0,boxSizing:"border-box"}} value={subject.instructions} onChange={e=>setSubject({...subject,instructions:e.target.value})}/></label>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}><Button disabled={busy||locked} type="submit"><Plus size={14}/>{subject.id ? "Update subject" : "Add subject"}</Button><Button type="button" variant="outline" onClick={()=>setSubject(initialSubject)}>Clear</Button></div>
          </form>
          <div style={{width:"100%",maxWidth:"100%",minWidth:0,boxSizing:"border-box"}}>{data.subjects.map(s=><div key={s.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0.5rem 0",borderTop:"1px solid var(--border)"}}><span>{s.title} ({data.questions.filter(q=>q.subjectId===s.id).length})</span><div><Button disabled={locked} size="icon-sm" variant="ghost" onClick={()=>setSubject(s)}><Pencil size={14}/></Button><Button disabled={locked} size="icon-sm" variant="ghost" onClick={()=>setSubjectDelete(s)}><Trash2 size={14}/></Button></div></div>)}</div>
        </div>
      </section>
    </div>
    <div className={styles.imports}>
      <section className={styles.station}><div className={styles.stationHead}><strong>Import CBT questions</strong></div><div className={styles.stationEdit}>
        <label>Subject<select value={importSubject} onChange={e=>setImportSubject(e.target.value)}><option value="">Select subject</option>{data.subjects.map(s=><option key={s.id} value={s.id}>{s.title}</option>)}</select></label>
        <p>Import A–E columns or provide options_json (a JSON array of objects with letter, label and text). Additional option_F and later columns are supported.</p>
      </div></section>
      <CsvImport title="Upload CBT questions" description="Choose a subject at left before importing." templateName="cbt_questions_template.csv" templateHeaders={["questionText","optionA","optionB","optionC","optionD","optionE","correctOption","marks"]} templateSample={[["What is 2+2?","3","4","5","6","","B",1]]} mapRows={importRows} replaceHint="replaces questions for the selected subject" onImport={async(rows,mode)=>{
        const ok = await action({action:"importQuestions",subjectId:importSubject,mode,rows});
        if (!ok) throw Error("CBT question import failed");
      }}/>
    </div>
    <section className={tableStyles.tableCard}>
      <div className={tableStyles.toolbar}><h2>CBT questions ({data.questions.length})</h2><Button disabled={busy||locked||!data.subjects.length} onClick={()=>setQuestion(initialQuestion)}><Plus size={14}/> Add question</Button></div>
      <div className={tableStyles.tableScroll}><table className={tableStyles.table}><thead><tr><th>Subject</th><th>Question</th><th>Marks</th><th>Key</th><th/></tr></thead><tbody>
        {data.questions.map(q=><tr key={q.id}><td>{data.subjects.find(s=>s.id===q.subjectId)?.title || "Unknown"}</td><td>{q.questionText}</td><td>{q.marks}</td><td>{q.correctOption}</td><td className={tableStyles.rowActions}><Button disabled={locked} variant="ghost" size="icon-sm" onClick={()=>selectQuestion(q)}><Pencil size={14}/></Button><Button disabled={locked} variant="ghost" size="icon-sm" onClick={()=>setQuestionDelete(q)}><Trash2 size={14}/></Button></td></tr>)}
        {!data.questions.length&&<tr><td colSpan={5}>No questions yet</td></tr>}
      </tbody></table></div>
    </section>
    <Dialog open={!!question} onOpenChange={v=>!v&&setQuestion(null)}><DialogContent><DialogHeader><DialogTitle>{question?.id ? "Edit CBT question" : "Add CBT question"}</DialogTitle></DialogHeader>
      {question&&<form style={{display:"grid",gap:12,maxHeight:"70vh",overflowY:"auto",minWidth:0}} onSubmit={async e=>{e.preventDefault(); if(await action({action:"saveQuestion",...question}))setQuestion(null);}}>
        <label>Subject<select required value={question.subjectId} onChange={e=>setQuestion({...question,subjectId:e.target.value})}><option value="">Select subject</option>{data.subjects.map(s=><option key={s.id} value={s.id}>{s.title}</option>)}</select></label>
        <label>Question<textarea required rows="3" style={{width:"100%",maxWidth:"100%",minWidth:0,boxSizing:"border-box"}} value={question.questionText} onChange={e=>setQuestion({...question,questionText:e.target.value})}/></label>
        <FlexibleOptionsEditor options={question.options} onChange={options=>setQuestion({...question,options})}
          correctOption={question.correctOption} onCorrectChange={correctOption=>setQuestion({...question,correctOption})}/>
        <label>Marks<Input type="number" min="0.01" step="0.01" value={question.marks} onChange={e=>setQuestion({...question,marks:Number(e.target.value)})}/></label>
        <label>Order<Input type="number" min="1" value={question.itemOrder} onChange={e=>setQuestion({...question,itemOrder:Number(e.target.value)})}/></label>
        <DialogFooter><Button type="button" variant="outline" onClick={()=>setQuestion(null)}>Cancel</Button><Button type="submit" disabled={busy||locked}>Save question</Button></DialogFooter>
      </form>}
    </DialogContent></Dialog>
    {[[subjectDelete,setSubjectDelete,"deleteSubject","subject"],[questionDelete,setQuestionDelete,"deleteQuestion","question"]].map(([item,close,kind,name])=><Dialog key={name} open={!!item} onOpenChange={v=>!v&&close(null)}><DialogContent><DialogHeader><DialogTitle>Delete {name}?</DialogTitle></DialogHeader><DialogFooter><Button variant="outline" onClick={()=>close(null)}>Cancel</Button><Button variant="destructive" disabled={busy} onClick={async()=>{if(await action({action:kind,id:item.id}))close(null);}}>Delete</Button></DialogFooter></DialogContent></Dialog>)}
  </div>;
}
