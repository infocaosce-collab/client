import { useEffect } from "react";
import { Helmet } from "react-helmet";
import { useDispatch, useSelector } from "react-redux";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { LogOut, ArrowLeftRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "../../../../components/shared/ui/actions/Button";
import { Skeleton } from "../../../../components/shared/ui/feedback/Skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../../components/shared/ui/navigation/Tabs";
import { ExamHeader, ExamTimer } from "../../../../components/shared/examination/ExamHeader";
import { RoleLogin } from "../../../../components/auth/RoleLogin";
import { AdminControlPanel } from "../../../../components/osce/control-room/AdminControlPanel";
import { AdminCandidatesPanel, AdminExaminersPanel } from "../../../../components/osce/control-room/AdminPeoplePanel";
import { AdminContentPanel } from "../../../../components/osce/control-room/AdminContentPanel";
import { AdminResultsPanel } from "../../../../components/osce/control-room/AdminResultsPanel";
import { getAdminData } from "../../../../endpoints/admin/data_GET.schema";
import { postLogout } from "../../../../endpoints/auth/logout_POST.schema";
import { usePublicSettings } from "../../../../helpers/usePublicSettings";
import { useLiveSignal } from "../../../../helpers/useLiveSignal";
import { useExamClock } from "../../../../helpers/useExamClock";
import * as AdminAction from "../../../../store/redux/admin_reducer.js";
import styles from "./admin.module.css";
export default function AdminPage() {
    const dispatch = useDispatch();
    const { isAuthenticated, activeAdmin, sessionToken } = useSelector((state) => state.adminFunction);
    const { data: settings } = usePublicSettings();
    const session = isAuthenticated && sessionToken
        ? { token: sessionToken, name: activeAdmin?.name || "Administrator" }
        : null;
    const setSession = (signedSession) => {
        if (!signedSession) {
            dispatch(AdminAction.logOutAdmin());
            return;
        }
        dispatch(AdminAction.startAdminAction({
            adminData: { name: signedSession.name || "Administrator" },
            sessionToken: signedSession.token,
        }));
    };
    if (!session) {
        return (<>
        <Helmet>
          <title>Control room sign in</title>
        </Helmet>
        <RoleLogin role="admin" settings={settings} onSignedIn={setSession}/>
      </>);
    }
    return <ControlRoom session={session} onSignOut={() => setSession(null)}/>;
}
function ControlRoom({ session, onSignOut }) {
    const token = session.token;
    const { data: liveSettings } = usePublicSettings();
    useLiveSignal([["adminData", token]], ["settings", "content", "progress", "examiners", "candidates"]);
    const q = useQuery({
        queryKey: ["adminData", token],
        queryFn: () => getAdminData(token),
        placeholderData: (p) => p,
        retry: (n, err) => err.status !== 401 && n < 2,
    });
    useEffect(() => {
        if (q.error?.status === 401) {
            toast.error("Your session ended. Please sign in again.");
            onSignOut();
        }
    }, [q.error, onSignOut]);
    const settings = liveSettings ?? q.data?.settings;
    const clock = useExamClock(settings);
    const signOut = async () => {
        try {
            await postLogout(token);
        }
        catch { }
        onSignOut();
    };
    return (<div className={styles.page}>
      <Helmet>
        <title>Control room</title>
      </Helmet>
      <ExamHeader settings={settings} context="Control room" right={<>
            <Link to="/cbt/admin"><Button variant="outline" size="sm"><ArrowLeftRight size={16}/> CBT Control Room</Button></Link>
            <ExamTimer clock={clock}/>
            <Button variant="ghost" size="icon" onClick={signOut} aria-label="Sign out" title="Sign out">
              <LogOut size={18}/>
            </Button>
          </>}/>
      <main className={styles.main}>
        {!q.data ? (q.isError ? (<p>{q.error.message}</p>) : (<Skeleton style={{ height: 400 }}/>)) : (<Tabs defaultValue="control">
            <TabsList className={styles.tabs}>
              <TabsTrigger value="control">Exam control</TabsTrigger>
              <TabsTrigger value="candidates">Candidates ({q.data.candidates.length})</TabsTrigger>
              <TabsTrigger value="content">Stations & uploads</TabsTrigger>
              <TabsTrigger value="examiners">Examiners ({q.data.examiners.length})</TabsTrigger>
              <TabsTrigger value="results">Results</TabsTrigger>
            </TabsList>
            <TabsContent value="control">
              <AdminControlPanel token={token} data={q.data} liveSettings={liveSettings}/>
            </TabsContent>
            <TabsContent value="candidates">
              <AdminCandidatesPanel token={token} data={q.data}/>
            </TabsContent>
            <TabsContent value="content">
              <AdminContentPanel token={token} data={q.data}/>
            </TabsContent>
            <TabsContent value="examiners">
              <AdminExaminersPanel token={token} data={q.data}/>
            </TabsContent>
            <TabsContent value="results">
              <AdminResultsPanel token={token}/>
            </TabsContent>
          </Tabs>)}
      </main>
    </div>);
}
