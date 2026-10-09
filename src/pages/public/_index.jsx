import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, ClipboardCheck } from "lucide-react";
import { ExamHeader } from "../../components/shared/examination/ExamHeader";
import { usePublicSettings } from "../../helpers/usePublicSettings";
import styles from "./_index.module.css";

const examinationTypes = [
  {
    to: "/osce",
    icon: ClipboardCheck,
    code: "OSCE",
    title: "OSCE Examination",
    description: "Objective Structured Clinical Examination. Access the candidate, examiner, and control room portals.",
  },
  {
    to: "/cbt",
    icon: BookOpen,
    code: "CBT",
    title: "CBT Examination",
    description: "Computer-Based Testing. Access the CBT candidate, examiner, and control room portals.",
  },
];

export default function IndexPage() {
  const { data: settings } = usePublicSettings();

  return (
    <div className={styles.page}>
      <Helmet>
        <title>{settings ? `${settings.institutionName} · Examinations` : "Examination Portal"}</title>
        <link rel="manifest" href="/manifest.json" />
      </Helmet>
      <ExamHeader settings={settings} context="Examination Portal" />
      <main className={styles.main}>
        <div className={styles.portalIntro}>
          <span className={styles.eyebrow}>EXAMINATION PORTAL</span>
          <h1 className={styles.heading}>Select an examination</h1>
          <p className={styles.lead}>
            Choose your examination type to continue to the candidate, examiner, or control room portal.
          </p>
        </div>
        <div className={styles.moduleGrid}>
          {examinationTypes.map((exam) => {
            const Icon = exam.icon;
            return (
              <Link key={exam.to} to={exam.to} className={styles.moduleCard}>
                <div className={styles.moduleTop}>
                  <span className={styles.moduleIcon}><Icon size={30} aria-hidden="true" /></span>
                  <span className={styles.moduleCode}>{exam.code}</span>
                </div>
                <h2 className={styles.moduleTitle}>{exam.title}</h2>
                <p className={styles.moduleDescription}>{exam.description}</p>
                <span className={styles.moduleLink}>
                  Continue to {exam.code} <ArrowRight size={17} aria-hidden="true" />
                </span>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
