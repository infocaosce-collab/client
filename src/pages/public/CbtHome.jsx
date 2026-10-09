import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, ClipboardCheck, MonitorSmartphone, ShieldCheck } from "lucide-react";
import { ExamHeader } from "../../components/shared/examination/ExamHeader";
import { usePublicSettings } from "../../helpers/usePublicSettings";
import styles from "./_index.module.css";

const portals = [
  {
    to: "/cbt/candidate",
    icon: MonitorSmartphone,
    title: "Candidate portal",
    body: "Sign in with your examination credentials and start the CBT when it becomes available.",
  },
  {
    to: "/cbt/examiner",
    icon: ClipboardCheck,
    title: "Examiner portal",
    body: "Access the CBT examiner workspace and review examination results.",
  },
  {
    to: "/cbt/admin",
    icon: ShieldCheck,
    title: "Control room",
    body: "Manage CBT subjects, questions, candidates, examination settings, and results.",
  },
];

export default function CbtHome() {
  const { data: settings } = usePublicSettings();
  return (
    <div className={styles.page}>
      <Helmet>
        <title>{settings ? `${settings.institutionName} · CBT` : "CBT"}</title>
        <link rel="manifest" href="/manifest.json" />
      </Helmet>
      <ExamHeader settings={settings} context="CBT" />
      <main className={styles.main}>
        <Link to="/" className={styles.backLink}>
          <ArrowLeft size={16} aria-hidden="true" /> All examinations
        </Link>
        <h1 className={styles.heading}>CBT · Which device is this?</h1>
        <p className={styles.lead}>
          Select the portal matching your role to enter the Computer-Based Testing system.
        </p>
        <div className={styles.grid}>
          {portals.map((portal) => {
            const Icon = portal.icon;
            return (
              <Link key={portal.to} to={portal.to} className={styles.card}>
                <Icon className={styles.icon} size={28} aria-hidden="true" />
                <div className={styles.cardTitle}>{portal.title}</div>
                <div className={styles.cardBody}>{portal.body}</div>
                <div className={styles.cardLink}>
                  {portal.to} <ArrowRight size={14} aria-hidden="true" />
                </div>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
