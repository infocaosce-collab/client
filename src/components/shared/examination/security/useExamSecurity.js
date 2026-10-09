import { useCallback, useEffect, useRef, useState } from "react";
import { localStore } from "../../../../helpers/localStore";

export const SECURITY_LIMIT = 3;
const INCIDENT_DEDUP_MS = 2200;

// Call this DIRECTLY in the student's Start/Continue click. Browsers prohibit
// guaranteed programmatic fullscreen after asynchronous navigation/effects.
export async function requestExamFullscreen() {
  if (document.fullscreenElement) return true;
  if (typeof document.documentElement.requestFullscreen !== "function") return false;
  try {
    await document.documentElement.requestFullscreen();
    return !!document.fullscreenElement;
  } catch {
    return false;
  }
}

const blank = () => ({ count: 0, locked: false, serverLocked: false, events: [], pending: [] });
const load = key => {
  if (!key) return blank();
  const saved = localStore.get(key, null);
  if (!saved || typeof saved !== "object") return blank();
  const events = Array.isArray(saved.events) ? saved.events : [];
  return {
    count: Math.min(SECURITY_LIMIT, Math.max(0, Number(saved.count) || 0)),
    locked: !!saved.locked || Number(saved.count) >= SECURITY_LIMIT,
    serverLocked: !!saved.serverLocked,
    events,
    pending: Array.isArray(saved.pending) ? saved.pending : [],
  };
};

const editable = target => !!target?.closest?.("input, textarea, select, [contenteditable='true']");

/**
 * Device-side security monitoring. NOT a substitute for server-side policy.
 * Incidents are durable locally and sent to reportIncident (requires a server
 * endpoint). The third incident also invokes the existing exam submit flow.
 */
export function useExamSecurity({ enabled, storageKey, context, reportIncident, serverSecurity }) {
  const [snapshot, setSnapshot] = useState(() => load(storageKey));
  const [fullscreen, setFullscreen] = useState(() => !!document.fullscreenElement);
  const [showIncident, setShowIncident] = useState(false);
  const [activationError, setActivationError] = useState("");
  const snapshotRef = useRef(snapshot);
  const enabledRef = useRef(enabled);
  const reportRef = useRef(reportIncident);
  const contextRef = useRef(context);
  const everFullscreenRef = useRef(!!document.fullscreenElement);
  const lastIncidentAtRef = useRef(0);
  const sendingRef = useRef(false);

  enabledRef.current = enabled;
  reportRef.current = reportIncident;
  contextRef.current = context;
  snapshotRef.current = snapshot;

  useEffect(() => {
    const next = load(storageKey);
    snapshotRef.current = next;
    setSnapshot(next);
    setShowIncident(false);
    lastIncidentAtRef.current = 0;
    everFullscreenRef.current = !!document.fullscreenElement;
    setFullscreen(!!document.fullscreenElement);
  }, [storageKey]);

  const persist = useCallback(next => {
    snapshotRef.current = next;
    localStore.set(storageKey, next);
    setSnapshot(next);
  }, [storageKey]);

  const flushIncidents = useCallback(async () => {
    if (!storageKey || sendingRef.current || !reportRef.current || !navigator.onLine) return;
    sendingRef.current = true;
    try {
      // One event at a time; only remove after confirmation from server.
      for (const item of snapshotRef.current.pending) {
        try {
          const response = await reportRef.current(item);
          if (response?.security) {
            const serverCount = Math.min(SECURITY_LIMIT, Math.max(0, Number(response.security.count) || 0));
            const pending = snapshotRef.current.pending.filter(e => e.id !== item.id);
            persist({ ...snapshotRef.current, pending,
              serverLocked: !!response.security.locked,
              count: Math.min(SECURITY_LIMIT, serverCount + pending.length),
              locked: !!response.security.locked || serverCount + pending.length >= SECURITY_LIMIT,
            });
            continue;
          } else {
            throw new Error("Security endpoint did not confirm authoritative status.");
          }
        } catch {
          break; // Backend endpoint absent/offline: keep event for later sync.
        }
      }
    } finally {
      sendingRef.current = false;
    }
  }, [storageKey, persist]);

  const recordIncident = useCallback(type => {
    if (!enabledRef.current || !storageKey || snapshotRef.current.locked) return;
    const now = Date.now();
    // fullscreenchange and visibilitychange often describe ONE user action.
    if (now - lastIncidentAtRef.current < INCIDENT_DEDUP_MS) return;
    lastIncidentAtRef.current = now;
    const event = {
      id: `${now}-${Math.random().toString(36).slice(2, 11)}`,
      type,
      detectedAt: new Date(now).toISOString(),
      observed: true, // A browser signal is not proof of deliberate malpractice.
      ...(contextRef.current || {}), // Capture the station/exam at event time.
    };
    const count = Math.min(SECURITY_LIMIT, snapshotRef.current.count + 1);
    const next = {
      ...snapshotRef.current, count, locked: count >= SECURITY_LIMIT,
      events: [...snapshotRef.current.events.slice(-49), event],
      pending: [...snapshotRef.current.pending, event],
    };
    persist(next);
    setShowIncident(true);
    // Sync on the next tick: avoid depending on a server response to warn.
    Promise.resolve().then(() => void flushIncidents());
    // Third local incident pauses the UI but does not submit until server confirmation.
    // A device-local warning counter must never irrevocably end a sitting.
  }, [storageKey, persist, flushIncidents]);

  const enterFullscreen = useCallback(async () => {
    const ok = await requestExamFullscreen();
    setFullscreen(!!document.fullscreenElement);
    if (ok) {
      everFullscreenRef.current = true;
      setActivationError("");
    } else {
      setActivationError("Fullscreen was not permitted. Use the button again or ask your invigilator for assistance.");
    }
    return ok;
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;
    if (document.fullscreenElement) everFullscreenRef.current = true;
    const onFullscreen = () => {
      const current = !!document.fullscreenElement;
      setFullscreen(current);
      if (current) {
        everFullscreenRef.current = true;
        setActivationError("");
      } else if (everFullscreenRef.current && document.visibilityState === "visible") {
        recordIncident("FULLSCREEN_EXIT");
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden" && everFullscreenRef.current) {
        recordIncident("PAGE_HIDDEN"); // May be tab switch or minimization.
      }
    };
    const blockCopy = event => { if (!editable(event.target)) event.preventDefault(); };
    const blockKeys = event => {
      if (editable(event.target)) return;
      if ((event.ctrlKey || event.metaKey) && ["a", "c", "x", "p", "s"].includes(event.key.toLowerCase())) {
        event.preventDefault();
      }
    };
    const blockSelection = event => { if (!editable(event.target)) event.preventDefault(); };
    document.addEventListener("fullscreenchange", onFullscreen);
    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("copy", blockCopy, true);
    document.addEventListener("cut", blockCopy, true);
    document.addEventListener("contextmenu", blockCopy, true);
    document.addEventListener("dragstart", blockCopy, true);
    document.addEventListener("selectstart", blockSelection, true);
    document.addEventListener("keydown", blockKeys, true);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreen);
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("copy", blockCopy, true);
      document.removeEventListener("cut", blockCopy, true);
      document.removeEventListener("contextmenu", blockCopy, true);
      document.removeEventListener("dragstart", blockCopy, true);
      document.removeEventListener("selectstart", blockSelection, true);
      document.removeEventListener("keydown", blockKeys, true);
    };
  }, [enabled, recordIncident]);

  useEffect(() => {
    if (!storageKey || !serverSecurity) return;
    const local = snapshotRef.current;
    const serverCount = Math.min(SECURITY_LIMIT, Math.max(0, Number(serverSecurity.count) || 0));
    const count = Math.min(SECURITY_LIMIT, serverCount + local.pending.length);
    const serverLocked = !!serverSecurity.locked;
    const locked = serverLocked || count >= SECURITY_LIMIT;
    if (local.count !== count || local.locked !== locked || local.serverLocked !== serverLocked) {
      persist({ ...local, count, locked, serverLocked });
    }
  }, [storageKey, serverSecurity?.count, serverSecurity?.locked, persist]);

  useEffect(() => {
    if (!storageKey) return undefined;
    void flushIncidents();
    const onOnline = () => {
      void flushIncidents();
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [storageKey, flushIncidents]);

  return {
    isFullscreen: fullscreen,
    count: snapshot.count,
    locked: snapshot.locked,
    pendingReports: snapshot.pending.length,
    lastEvent: snapshot.events[snapshot.events.length - 1] || null,
    needsFullscreen: enabled && !fullscreen && !snapshot.locked,
    showIncident,
    dismissIncident: () => setShowIncident(false),
    activationError,
    enterFullscreen,
  };
}
