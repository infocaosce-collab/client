import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import { ClipboardCheck, MonitorSmartphone, ShieldCheck, ArrowRight } from "lucide-react";
import { ExamHeader } from "../../components/shared/examination/ExamHeader";
import { usePublicSettings } from "../../helpers/usePublicSettings";
import styles from "./_index.module.css";
const devices = [
    {
        to: "/c",
        icon: MonitorSmartphone,
        title: "Candidate device",
        body: "Computer-based test for question stations 2, 4 and 6. Sign in with exam number and PIN.",
    },
    {
        to: "/e",
        icon: ClipboardCheck,
        title: "Examiner device",
        body: "Checklist scoring for procedure stations 1, 3 and 5, plus project, viva and client care.",
    },
    {
        to: "/admin",
        icon: ShieldCheck,
        title: "Control room",
        body: "Upload candidates, checklists and questions, assign examiners, run the clock and export results.",
    },
];
export default function IndexPage() {
    const { data: settings } = usePublicSettings();
    return (<div className={styles.page}>
      <Helmet>
        <title>{settings ? `${settings.institutionName} · OSCE` : "OSCE"}</title>
        <link rel="manifest" href="/manifest.json"/>
      </Helmet>
      <ExamHeader settings={settings}/>
      <main className={styles.main}>
        <h1 className={styles.heading}>Which device is this?</h1>
        <p className={styles.lead}>
          Open the matching link on each device. Every device follows the control room automatically — time,
          branding and content changes appear without reloading.
        </p>
        <div className={styles.grid}>
          {devices.map((d) => (<Link key={d.to} to={d.to} className={styles.card}>
              <d.icon className={styles.icon} size={28}/>
              <div className={styles.cardTitle}>{d.title}</div>
              <div className={styles.cardBody}>{d.body}</div>
              <div className={styles.cardLink}>
                {d.to} <ArrowRight size={14}/>
              </div>
            </Link>))}
        </div>
        <ol className={styles.stations}>
          {[1, 2, 3, 4, 5, 6].map((n) => (<li key={n} className={styles.station}>
              <span className={styles.stationNo}>{n}</span>
              <span>{n % 2 === 1 ? "Procedure" : "Questions"}</span>
            </li>))}
        </ol>
      </main>
    </div>);
}
