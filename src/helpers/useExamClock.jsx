import { useEffect, useRef, useState } from "react";
/**
 * Countdown driven by the SERVER's clock (serverNow offset), so a device with a
 * wrong clock still shows the right time and ends at the same moment as others.
 */
export function useExamClock(settings) {
    const offsetRef = useRef(0);
    const lastServerNow = useRef(null);
    if (settings) {
        const sn = new Date(settings.serverNow).getTime();
        if (lastServerNow.current !== sn) {
            lastServerNow.current = sn;
            offsetRef.current = sn - Date.now();
        }
    }
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const t = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(t);
    }, []);
    if (!settings)
        return { status: "not_started", remainingMs: null, timeUp: false };
    const serverNow = now + offsetRef.current;
    const endsAt = settings.endsAt ? new Date(settings.endsAt).getTime() : null;
    let status = settings.examStatus;
    if (status === "running" && endsAt !== null && serverNow >= endsAt)
        status = "ended";
    const remainingMs = status === "running" && endsAt !== null ? Math.max(0, endsAt - serverNow) : null;
    return { status, remainingMs, timeUp: status === "ended" };
}
