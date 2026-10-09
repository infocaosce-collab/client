import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRealtimeChannel, useRealtimeReconnect } from "../components/shared/providers/SocketRealtimeProvider";

// Reuse OSCE's change-signal / HTTP refetch pattern, with a CBT-specific
// room and a small throttle for classrooms with many answering candidates.
export function useCbtLiveSignal(queryKey, events = null) {
  const qc = useQueryClient();
  const keyRef = useRef(queryKey);
  const eventsRef = useRef(events);
  const last = useRef(0);
  const timer = useRef(null);
  keyRef.current = queryKey;
  eventsRef.current = events;
  const schedule = () => {
    if (timer.current) return;
    const elapsed = Date.now() - last.current;
    timer.current = setTimeout(() => {
      timer.current = null;
      last.current = Date.now();
      qc.invalidateQueries({ queryKey: keyRef.current, exact: true });
    }, Math.max(100, 3000 - elapsed));
  };
  useRealtimeChannel("cbt:live", m => {
    if (!eventsRef.current || eventsRef.current.includes(m?.type)) schedule();
  });
  useRealtimeReconnect(schedule);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
}
