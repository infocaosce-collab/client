import React from "react";
import { AlertTriangle, LogOut, Maximize2, ShieldAlert, ShieldCheck, ShieldX } from "lucide-react";
import { Button } from "../../ui/actions/Button";

const modalStyles = {
  backdrop: { position: "fixed", inset: 0, zIndex: 2147483000, display: "grid", placeItems: "center",
    padding: "18px", background: "rgba(12,22,39,.87)", userSelect: "none", WebkitUserSelect: "none" },
  panel: { boxSizing: "border-box", width: "min(100%, 475px)", maxHeight: "90dvh", overflowY: "auto",
    borderRadius: 18, background: "#fff", color: "#17243a", padding: "clamp(20px,4vw,32px)",
    boxShadow: "0 25px 90px rgba(0,0,0,.25)", textAlign: "center" },
  note: { fontSize: 14, color: "#64748b", lineHeight: 1.6, margin: "10px 0 20px" },
};

export function ExamSecurityIndicator({ security }) {
  if (!security) return null;
  const color = security.count >= 2 ? "#b42318" : security.count ? "#b45309" : "#15803d";
  return <span title="Examination security warnings" aria-label={`${security.count} of 3 examination security warnings`}
    style={{ display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 700, color,
      padding: "5px 10px", borderRadius: 9, background: "#fff", border: `1px solid ${color}55`, fontSize: 13 }}>
    {security.count ? <ShieldAlert size={17}/> : <ShieldCheck size={17}/>} {security.count}/3 warnings
  </span>;
}

export function ExamSecurityOverlay({ security, title = "Examination security", onSignOut }) {
  if (!security) return null;
  const { locked, needsFullscreen, showIncident, isFullscreen, lastEvent, count, pendingReports,
    enterFullscreen, dismissIncident, activationError } = security;
  if (!locked && !needsFullscreen && !showIncident) return null;
  const incidentText = lastEvent?.type === "PAGE_HIDDEN"
    ? "Your examination page was hidden (for example, because another tab or window became active or the window was minimized)."
    : "Your examination left fullscreen mode.";
  return <div style={modalStyles.backdrop} role="presentation">
    <div style={modalStyles.panel} role="alertdialog" aria-modal="true" aria-label={title}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 12, color: locked ? "#b42318" : "#ba6d11" }}>
        {locked ? <ShieldX size={45}/> : count ? <AlertTriangle size={45}/> : <Maximize2 size={45}/>}
      </div>
      <h2 style={{ fontSize: "clamp(19px,3vw,24px)", fontWeight: 750, margin: "0 0 12px" }}>
        {locked ? pendingReports > 0 ? "Exam paused — awaiting security verification" : "Examination locked — 3 warnings" : count ? "Examination security warning" : "Enter fullscreen to continue"}
      </h2>
      <p style={modalStyles.note}>
        {locked ? pendingReports > 0 ? "Three browser-security incidents were detected on this device. Please reconnect so the server can verify your warnings; contact the invigilator." : "The examination has been locked by the security system. Please inform the invigilator."
          : count ? `${incidentText} This event is recorded as a security warning, not conclusive proof of malpractice. Return to fullscreen to continue.`
            : "To protect the examination, activate fullscreen. Most browsers only permit this after you click the button below."}
      </p>
      <div aria-live="polite" style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 16 }}>
        {[1, 2, 3].map(i => <span key={i} title={`Warning ${i}`} style={{ width: 28, height: 28, borderRadius: 8,
          display: "grid", placeItems: "center", fontWeight: 700, fontSize: 14,
          background: i <= count ? "#fee2e2" : "#edf2f7", color: i <= count ? "#b42318" : "#94a3b8" }}>{i}</span>)}
      </div>
      {activationError && !locked && <p style={{ ...modalStyles.note, color: "#b42318" }}>{activationError}</p>}
      {!locked && <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 10 }}>
        {!isFullscreen && <Button onClick={() => void enterFullscreen()}><Maximize2 size={17}/> Enter fullscreen</Button>}
        {isFullscreen && count > 0 && <Button onClick={dismissIncident}>Continue examination</Button>}
      </div>}
      {locked && <p style={{ ...modalStyles.note, marginBottom: 0 }}>{pendingReports > 0 ? "Security events are stored on this device, pending backend synchronization." : "Contact the Control Room for assistance."}</p>}
      {locked && typeof onSignOut === "function" && <div style={{ display: "flex", justifyContent: "center", marginTop: 18 }}>
        <Button variant="outline" onClick={onSignOut} aria-label="Sign out and return to candidate sign in">
          <LogOut size={17}/> Sign out
        </Button>
      </div>}
      {!locked && <p style={{ ...modalStyles.note, fontSize: 12, marginBottom: 0 }}>Browser controls cannot be forcibly disabled. Ask your invigilator for assistance if fullscreen is unavailable.</p>}
    </div>
  </div>;
}
