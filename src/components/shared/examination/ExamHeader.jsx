import styles from "./ExamHeader.module.css";
export function formatDuration(ms) {
    const total = Math.ceil(ms / 1000);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const pad = (n) => String(n).padStart(2, "0");
    return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}
export const ExamTimer = ({ clock, className }) => {
    let label = "Not started";
    let tone = styles.idle;
    if (clock.status === "ended") {
        label = "Time up";
        tone = styles.danger;
    }
    else if (clock.status === "running" && clock.remainingMs !== null) {
        label = formatDuration(clock.remainingMs);
        tone = clock.remainingMs < 60000 ? styles.danger : clock.remainingMs < 300000 ? styles.warn : styles.ok;
    }
    else if (clock.status === "running") {
        label = "Open";
        tone = styles.ok;
    }
    return (<div className={`${styles.timer} ${tone} ${className ?? ""}`} role="timer" aria-live="off">
      <span className={styles.timerLabel}>
        {clock.status === "running" && clock.remainingMs !== null ? "Time left" : "Exam"}
      </span>
      <span className={styles.timerValue}>{label}</span>
    </div>);
};
export const ExamHeader = ({ settings, context, right, className }) => {
    return (<header className={`${styles.header} ${className ?? ""}`}>
      <div className={styles.brand}>
        {settings?.logoUrl ? (<img src={settings.logoUrl} alt="" className={styles.logo}/>) : (<div className={styles.logoPlaceholder} aria-hidden>
            {(settings?.institutionName ?? "O").slice(0, 1)}
          </div>)}
        <div className={styles.brandText}>
          <div className={styles.institution}>{settings?.institutionName ?? " "}</div>
          <div className={styles.examTitle}>
            {settings?.examTitle ?? ""}
            {context ? <span className={styles.context}> · {context}</span> : null}
          </div>
        </div>
      </div>
      {right ? <div className={styles.right}>{right}</div> : null}
    </header>);
};
