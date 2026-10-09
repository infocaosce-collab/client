import { useCallback, useEffect, useRef, useState } from "react";
import { localStore } from "./localStore";

/** OSCE-style device-first persistence, scoped to a single CBT sitting.
 * Saves every choice immediately to localStorage, sends latest choices to
 * MongoDB in order, retries outages, and exposes an awaitable final flush.
 */
export function useCbtAnswerQueue(key, send, onRejected) {
  const itemsRef = useRef([]);
  const [pending, setPending] = useState(0);
  const [online, setOnline] = useState(() => navigator.onLine);
  const [syncing, setSyncing] = useState(false);
  const taskRef = useRef(null);
  const timer = useRef(null);
  const sendRef = useRef(send);
  const rejectRef = useRef(onRejected);
  sendRef.current = send;
  rejectRef.current = onRejected;

  const persist = useCallback(items => {
    itemsRef.current = items;
    setPending(items.length);
    if (key) localStore.set(key, items);
  }, [key]);

  const flush = useCallback(() => {
    if (taskRef.current) return taskRef.current;
    if (!key || !itemsRef.current.length) return Promise.resolve(true);
    const job = (async () => {
      setSyncing(true);
      let clean = true;
      try {
        while (itemsRef.current.length) {
          const batch = itemsRef.current.slice(0, 200);
          try {
            // Dedup latest locally, preserving chronological order of selection.
            const latest = new Map();
            for (const row of batch) latest.set(row.questionId, row);
            await sendRef.current([...latest.values()]);
            const processed = new Set(batch.map(row => row.localId));
            persist(itemsRef.current.filter(row => !processed.has(row.localId)));
            setOnline(true);
          } catch (err) {
            clean = false;
            if (err.status === 0 || (err.status || 0) >= 500) {
              if (err.status === 0) setOnline(false);
              break;
            }
            // Do not discard a failed answer without telling the user.
            rejectRef.current?.(err);
            break;
          }
        }
      } finally { setSyncing(false); }
      return clean && itemsRef.current.length === 0;
    })();
    taskRef.current = job;
    job.finally(() => { if (taskRef.current === job) taskRef.current = null; });
    return job;
  }, [key, persist]);

  const enqueue = useCallback(item => {
    persist([...itemsRef.current, { ...item, localId: `${Date.now()}-${Math.random()}` }]);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { timer.current = null; void flush(); }, 350);
  }, [flush, persist]);

  useEffect(() => {
    const loaded = key ? localStore.get(key, []) : [];
    itemsRef.current = Array.isArray(loaded) ? loaded : [];
    setPending(itemsRef.current.length);
    if (key && itemsRef.current.length) void flush();
    const reconnect = () => { setOnline(true); void flush(); };
    const disconnected = () => setOnline(false);
    window.addEventListener("online", reconnect);
    window.addEventListener("offline", disconnected);
    const interval = setInterval(() => { if (navigator.onLine && itemsRef.current.length) void flush(); }, 4000);
    return () => {
      window.removeEventListener("online", reconnect);
      window.removeEventListener("offline", disconnected);
      clearInterval(interval);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [key, flush]);
  return { enqueue, flush, pending, pendingItems: itemsRef.current, online, syncing };
}
