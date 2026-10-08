import { useEffect, useRef, useState } from "react";
/**
 * Milliseconds left until `endsAt`, measured on the SERVER's clock (using the
 * serverNow stamp from the last fetch), ticking every second. null when there
 * is no deadline.
 */
export function useServerCountdown(endsAt, serverNow) {
    const offsetRef = useRef(0);
    const lastStamp = useRef(null);
    if (serverNow) {
        const sn = new Date(serverNow).getTime();
        if (lastStamp.current !== sn) {
            lastStamp.current = sn;
            offsetRef.current = sn - Date.now();
        }
    }
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const t = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(t);
    }, []);
    if (!endsAt)
        return null;
    return Math.max(0, new Date(endsAt).getTime() - (now + offsetRef.current));
}
