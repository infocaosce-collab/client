import { useCallback, useEffect, useState } from "react";
import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { LogOut, ArrowLeftRight, Download } from "lucide-react";
import { Button } from "../../../../components/shared/ui/actions/Button";
import { Skeleton } from "../../../../components/shared/ui/feedback/Skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../../components/shared/ui/navigation/Tabs";
import { ExamHeader, ExamTimer } from "../../../../components/shared/examination/ExamHeader";
import { RoleLogin } from "../../../../components/auth/RoleLogin";
import { useExamClock } from "../../../../helpers/useExamClock";
import { useCbtLiveSignal } from "../../../../helpers/useCbtLiveSignal";
import { csv } from "../../../../helpers/csv";
import { getCbtSettings, loginCbt, logoutCbt, getCbtAdmin, actionCbtAdmin } from "../../../../endpoints/cbt/api";
import * as AdminAction from "../../../../store/redux/cbt_admin_reducer";
import CbtControlPanel from "../../../../components/cbt/control-room/CbtControlPanel";
import { CbtCandidatesPanel, CbtExaminersPanel } from "../../../../components/cbt/control-room/CbtPeoplePanel";
import CbtContentPanel from "../../../../components/cbt/control-room/CbtContentPanel";
import styles from "../../osce/control-room/admin.module.css";
import resultStyles from "../../../../components/osce/control-room/AdminResultsPanel.module.css";

export default function CbtAdmin() {
  const dispatch = useDispatch();
  const { isAuthenticated, activeAdmin, sessionToken } = useSelector(s=>s.cbtAdminFunction);
  const { data: settings } = useQuery({ queryKey: ["cbtPublicSettings"], queryFn: getCbtSettings });
  const setSession = session => dispatch(AdminAction.startAdminAction({adminData:{name:session.name||"CBT Administrator"},sessionToken:session.token}));
  const clearSession = useCallback(() => dispatch(AdminAction.logOutAdmin()), [dispatch]);
  if (!isAuthenticated || !sessionToken) return <><Helmet><title>CBT Control Room sign in</title></Helmet><RoleLogin role="admin" settings={settings} onSignedIn={setSession} login={loginCbt} backTo="/cbt"/></>;
  return <CbtControlRoom token={sessionToken} name={activeAdmin?.name} clearSession={clearSession}/>;
}

function CbtControlRoom({token,clearSession}) {
  const qc = useQueryClient();
  const [busy,setBusy] = useState(false);
  const q = useQuery({queryKey:["cbtAdmin",token],queryFn:()=>getCbtAdmin(token),placeholderData:p=>p,refetchInterval:15000,retry:(n,e)=>e.status!==401&&n<2});
  useCbtLiveSignal(["cbtAdmin",token]);
  useEffect(()=>{if(q.error?.status===401){toast.error("CBT administrator session ended. Please sign in again.");clearSession();}},[q.error,clearSession]);
  const settings = q.data?.settings;
  const clock = useExamClock(settings);
  const action = async input => {
    setBusy(true);
    try {
      const result = await actionCbtAdmin(token,input);
      toast.success(result.message || "CBT changes saved.");
      await Promise.all([
        qc.invalidateQueries({queryKey:["cbtAdmin"]}),
        qc.invalidateQueries({queryKey:["cbtPublicSettings"]}),
        qc.invalidateQueries({queryKey:["cbtCandidate"]}),
        qc.invalidateQueries({queryKey:["cbtExaminer"]}),
      ]);
      return true;
    } catch(e){toast.error(e.message);return false;}
    finally{setBusy(false);}
  };
  const signOut = async()=>{try{await logoutCbt(token);}catch{}clearSession();};
  return <div className={styles.page}>
    <Helmet><title>CBT Control Room — ALACAD</title></Helmet>
    <ExamHeader settings={settings} context="CBT Control room" right={<>
      <Link to="/admin"><Button variant="outline" size="sm"><ArrowLeftRight size={16}/> OSCE Control Room</Button></Link>
      <ExamTimer clock={clock}/>
      <Button variant="ghost" size="icon" onClick={signOut} title="Sign out" aria-label="Sign out"><LogOut size={18}/></Button>
    </>}/>
    <main className={styles.main}>
      {!q.data ? (q.isError ? <p>{q.error?.message} <Button onClick={()=>q.refetch()}>Retry</Button></p> : <Skeleton style={{height:400}}/>) :
        <Tabs defaultValue="control">
          <TabsList className={styles.tabs}>
            <TabsTrigger value="control">Exam control</TabsTrigger>
            <TabsTrigger value="candidates">Candidates ({q.data.candidates.length})</TabsTrigger>
            <TabsTrigger value="content">Station 1 & uploads</TabsTrigger>
            <TabsTrigger value="examiners">Examiners ({q.data.examiners.length})</TabsTrigger>
            <TabsTrigger value="results">Results</TabsTrigger>
          </TabsList>
          <TabsContent value="control"><CbtControlPanel data={q.data} action={action} busy={busy}/></TabsContent>
          <TabsContent value="candidates"><CbtCandidatesPanel data={q.data} action={action} busy={busy}/></TabsContent>
          <TabsContent value="content"><CbtContentPanel data={q.data} action={action} busy={busy}/></TabsContent>
          <TabsContent value="examiners"><CbtExaminersPanel data={q.data} action={action} busy={busy}/></TabsContent>
          <TabsContent value="results"><CbtResultsPanel data={q.data}/></TabsContent>
        </Tabs>
      }
    </main>
  </div>;
}
function CbtResultsPanel({data}) {
  const results=data.results;
  const exportRows=()=>csv.download("cbt-results.csv",csv.stringify(["examNumber","fullName","answeredCount","questionCount","score","maxScore","percentage","status"],results.map(r=>[r.examNumber,r.fullName,r.answeredCount,r.questionCount,r.score,r.maxScore,r.percentage,r.status])));
  return <section className={resultStyles.card}>
    <div className={resultStyles.toolbar}><strong>CBT results — current sitting</strong><span className={resultStyles.meta}>{results.length} attempts</span><Button variant="outline" size="sm" onClick={exportRows}><Download size={14}/> Export CSV</Button></div>
    <div className={resultStyles.scroll}><table className={resultStyles.table}><thead><tr><th>Exam no.</th><th>Candidate</th><th>Answered</th><th>Score</th><th>Maximum</th><th>Percent</th><th>Status</th></tr></thead><tbody>
      {results.map(r=><tr key={r.candidateId}><td className={resultStyles.mono}>{r.examNumber}</td><td>{r.fullName}</td><td className={resultStyles.num}>{r.answeredCount}/{r.questionCount}</td><td className={resultStyles.num}>{r.score}</td><td className={resultStyles.num}>{r.maxScore}</td><td className={resultStyles.num}>{r.percentage}%</td><td>{r.status.replace(/_/g," ")}</td></tr>)}
      {!results.length&&<tr><td colSpan={7}>No CBT examination attempts yet.</td></tr>}
    </tbody></table></div>
  </section>;
}
