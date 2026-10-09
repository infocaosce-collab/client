import { CloudOff, CloudUpload, Check } from "lucide-react";
import styles from "./SyncStatus.module.css";
/** Small pill telling the user whether their work has reached the server. */
export const SyncStatus = ({ online, pending, syncing, className }) => {
    let icon = <Check size={14}/>;
    let text = "All saved";
    let tone = styles.ok;
    if (!online) {
        icon = <CloudOff size={14}/>;
        text = pending > 0 ? `Offline · ${pending} saved on device` : "Offline";
        tone = styles.offline;
    }
    else if (pending > 0 || syncing) {
        icon = <CloudUpload size={14}/>;
        text = pending > 0 ? `Syncing ${pending}…` : "Syncing…";
        tone = styles.syncing;
    }
    return (<span className={`${styles.pill} ${tone} ${className ?? ""}`} aria-live="polite">
      {icon}
      {text}
    </span>);
};
