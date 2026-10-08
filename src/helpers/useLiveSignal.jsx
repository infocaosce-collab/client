import { useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import { useRealtimeChannel, useRealtimeReconnect } from "../components/SocketRealtimeProvider";
import { channels } from "./realtimeChannels";
// One shared, throttled refresh for the whole page. Several components can ask
// for the same keys; every change signal (or reconnect) results in at most ONE
// refetch per key, and never more often than MIN_GAP_MS.
const MIN_GAP_MS = 3000;
const pendingKeys = new Map();
let timer = null;
let lastRun = 0;
function schedule(qc, keys) {
    for (const k of keys)
        pendingKeys.set(JSON.stringify(k), k);
    if (timer)
        return;
    const wait = Math.max(300 + Math.random() * 400, lastRun + MIN_GAP_MS - Date.now());
    // Spread devices out so 50 tablets don't all hit the server in the same instant.
    const jitter = Math.random() * 1500;
    timer = setTimeout(() => {
        timer = null;
        lastRun = Date.now();
        const keysNow = [...pendingKeys.values()];
        pendingKeys.clear();
        for (const k of keysNow)
            qc.invalidateQueries({ queryKey: k, exact: true });
    }, wait + jitter);
}
/**
 * Refetches the given queries when a RELEVANT change happens (only the event
 * types listed — e.g. candidates ignore every examiner's mark) and after a
 * reconnect, so a device that was offline catches up automatically.
 */
export function useLiveSignal(queryKeys, events) {
    const qc = useQueryClient();
    const keysRef = useRef(queryKeys);
    keysRef.current = queryKeys;
    const eventsRef = useRef(events);
    eventsRef.current = events;
    useRealtimeChannel(channels.examLive(), (msg) => {
        if (eventsRef.current.includes((msg?.type ?? "")))
            schedule(qc, keysRef.current);
    });
    useRealtimeReconnect(() => schedule(qc, keysRef.current));
}
