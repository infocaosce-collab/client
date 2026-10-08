import { useCallback, useEffect, useRef, useState } from "react";
import { localStore } from "./localStore";
/**
 * Offline-first write queue. Items are persisted to the device immediately and
 * sent in order whenever the network is available (retrying with backoff), so
 * work done while the Wi-Fi drops is never lost — even across a page reload.
 *
 * `send` receives every pending item and returns how many (from the front) it
 * delivered. Errors with status 0 or >= 500 are retried; other errors (4xx)
 * drop the front item and are reported through onRejected.
 */
export function usePersistentQueue(storageKey, send, onRejected, options) {
    const [entries, setEntries] = useState(() => storageKey ? localStore.get(storageKey, []) : []);
    const [syncing, setSyncing] = useState(false);
    const [online, setOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));
    const entriesRef = useRef(entries);
    const inFlight = useRef(false);
    const retryTimer = useRef(null);
    const delayTimer = useRef(null);
    const delayMs = options?.delayMs ?? 0;
    const backoff = useRef(2000);
    const sendRef = useRef(send);
    sendRef.current = send;
    const rejectRef = useRef(onRejected);
    rejectRef.current = onRejected;
    // Reload when the key changes (e.g. a different candidate signs in).
    useEffect(() => {
        const loaded = storageKey ? localStore.get(storageKey, []) : [];
        entriesRef.current = loaded;
        setEntries(loaded);
    }, [storageKey]);
    const persist = useCallback((next) => {
        entriesRef.current = next;
        setEntries(next);
        if (storageKey)
            localStore.set(storageKey, next);
    }, [storageKey]);
    const flush = useCallback(async () => {
        if (inFlight.current || entriesRef.current.length === 0)
            return;
        inFlight.current = true;
        setSyncing(true);
        try {
            while (entriesRef.current.length > 0) {
                const batch = entriesRef.current;
                try {
                    const consumed = await sendRef.current(batch.map((e) => e.item));
                    const sentIds = new Set(batch.slice(0, Math.max(1, consumed)).map((e) => e.id));
                    persist(entriesRef.current.filter((e) => !sentIds.has(e.id)));
                    backoff.current = 2000;
                    setOnline(true);
                }
                catch (err) {
                    const status = err.status ?? 0;
                    if (status === 0 || status >= 500) {
                        if (status === 0)
                            setOnline(false);
                        if (retryTimer.current)
                            clearTimeout(retryTimer.current);
                        // Jitter so many devices don't all retry at the same moment.
                        retryTimer.current = setTimeout(() => void flush(), backoff.current + Math.random() * 2000);
                        backoff.current = Math.min(30000, backoff.current * 2);
                        break;
                    }
                    const [first, ...rest] = entriesRef.current;
                    persist(rest);
                    if (first)
                        rejectRef.current?.(first.item, err);
                }
            }
        }
        finally {
            inFlight.current = false;
            setSyncing(false);
        }
    }, [persist]);
    const enqueue = useCallback((item, opts) => {
        persist([...entriesRef.current, { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, item }]);
        if (delayMs > 0 && !opts?.immediate) {
            if (!delayTimer.current) {
                delayTimer.current = setTimeout(() => {
                    delayTimer.current = null;
                    void flush();
                }, delayMs);
            }
            return;
        }
        if (delayTimer.current) {
            clearTimeout(delayTimer.current);
            delayTimer.current = null;
        }
        void flush();
    }, [persist, flush, delayMs]);
    useEffect(() => {
        const goOnline = () => {
            setOnline(true);
            backoff.current = 2000;
            void flush();
        };
        const goOffline = () => setOnline(false);
        window.addEventListener("online", goOnline);
        window.addEventListener("offline", goOffline);
        void flush();
        return () => {
            window.removeEventListener("online", goOnline);
            window.removeEventListener("offline", goOffline);
            if (retryTimer.current)
                clearTimeout(retryTimer.current);
            if (delayTimer.current)
                clearTimeout(delayTimer.current);
        };
    }, [flush]);
    return {
        pending: entries.length,
        pendingItems: entries.map((e) => e.item),
        syncing,
        online,
        enqueue,
        flush,
    };
}
