import { useCallback, useEffect } from "react";
import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { LogOut, ArrowLeftRight } from "lucide-react";
import { Button } from "../../../../components/shared/ui/actions/Button";
import { RoleLogin } from "../../../../components/auth/RoleLogin";
import { ExamHeader, ExamTimer } from "../../../../components/shared/examination/ExamHeader";
import { Badge } from "../../../../components/shared/ui/feedback/Badge";
import { useExamClock } from "../../../../helpers/useExamClock";
import { useCbtLiveSignal } from "../../../../helpers/useCbtLiveSignal";
import { getCbtSettings, getCbtExaminer, loginCbt, logoutCbt } from "../../../../endpoints/cbt/api";
import * as ExaminerAction from "../../../../store/redux/cbt_examiner_reducer";
import pageStyles from "../../osce/control-room/admin.module.css";
import peopleStyles from "../../../../components/osce/control-room/AdminPeoplePanel.module.css";
import resultStyles from "../../../../components/osce/control-room/AdminResultsPanel.module.css";

export default function CbtExaminer() {
  const dispatch = useDispatch();
  const { isAuthenticated, sessionToken } = useSelector(s => s.cbtExaminerFunction);
  const { data: settings } = useQuery({ queryKey:["cbtPublicSettings"], queryFn:getCbtSettings });
  const signedIn = session => dispatch(ExaminerAction.startExaminerAction({examinerData:{name:session.name},sessionToken:session.token}));
  const signOutLocal = useCallback(()=>dispatch(ExaminerAction.logOutExaminer()),[dispatch]);
  if (!isAuthenticated || !sessionToken) return <><Helmet><title>CBT — Examiner sign in</title></Helmet><RoleLogin role="examiner" settings={settings} onSignedIn={signedIn} login={loginCbt} backTo="/cbt"/></>;
  return <ExaminerDesk token={sessionToken} signOutLocal={signOutLocal}/>;
}

function ExaminerDesk({token,signOutLocal}) {
  const q = useQuery({queryKey:["cbtExaminer",token],queryFn:()=>getCbtExaminer(token),retry:(n,e)=>e.status!==401 && n<2,refetchInterval:15000});
  useCbtLiveSignal(["cbtExaminer",token]);
  useEffect(()=>{if(q.error?.status===401){toast.error("CBT examiner session ended.");signOutLocal();}},[q.error,signOutLocal]);
  const clock = useExamClock(q.data?.settings);
  const signOut=async()=>{try{await logoutCbt(token);}catch{}signOutLocal();};
  return <div className={pageStyles.page}>
    <Helmet><title>CBT — Examiner workspace</title></Helmet>
    <ExamHeader settings={q.data?.settings} context="CBT Examiner · Station 1" right={<>
      <Link to="/examiner"><Button variant="outline" size="sm"><ArrowLeftRight size={16}/> OSCE Examiner</Button></Link>
      <ExamTimer clock={clock}/>
      <Button variant="ghost" size="icon" title="Sign out" aria-label="Sign out" onClick={signOut}><LogOut size={18}/></Button>
    </>}/>
    <main className={pageStyles.main}>
      {!q.data ? <section className={peopleStyles.tableCard} style={{padding:24}}>{q.error?.message||"Loading CBT station…"} <Button variant="outline" onClick={()=>q.refetch()}>Retry</Button></section> : <>
        <section className={peopleStyles.stationBoard} style={{marginBottom:18}}>
          <div className={peopleStyles.boardCell}><div className={peopleStyles.boardHead}><span className={peopleStyles.boardNo}>1</span><span className={peopleStyles.boardKind}>Question station</span></div>
            <strong>CBT examination</strong><p>Welcome, {q.data.examiner.name}. Multiple-choice answers are marked automatically by the server.</p>
            <Badge variant={clock.status==="running"?"success":"outline"}>{clock.status.replace(/_/g," ")}</Badge>
          </div>
        </section>
        <section className={resultStyles.card}>
          <div className={resultStyles.toolbar}><strong>Candidate assessment review — Station 1</strong><span className={resultStyles.meta}>{q.data.results.length} attempts</span></div>
          <div className={resultStyles.scroll}><table className={resultStyles.table}><thead><tr><th>Exam number</th><th>Candidate</th><th>Answered</th><th>Score</th><th>Maximum</th><th>Percentage</th><th>Status</th></tr></thead><tbody>
            {q.data.results.map(r=><tr key={r.candidateId}><td>{r.examNumber}</td><td>{r.fullName}</td><td>{r.answeredCount}/{r.questionCount}</td><td>{r.score}</td><td>{r.maxScore}</td><td>{r.percentage}%</td><td>{r.status.replace(/_/g," ")}</td></tr>)}
            {!q.data.results.length&&<tr><td colSpan={7}>No CBT candidates have started this examination.</td></tr>}
          </tbody></table></div>
        </section>
      </>}
    </main>
  </div>;
}
