import { useQuery } from "@tanstack/react-query";
import { getPublicSettings } from "../endpoints/public/settings_GET.schema";
import { localStore } from "./localStore";
import { useLiveSignal } from "./useLiveSignal";
const CACHE_KEY = "osce.cache.publicSettings";
/** Institution branding + exam clock, live-updated and cached for offline starts. */
export function usePublicSettings() {
    useLiveSignal([["publicSettings"]], ["settings"]);
    return useQuery({
        queryKey: ["publicSettings"],
        queryFn: async () => {
            const s = await getPublicSettings();
            localStore.set(CACHE_KEY, { ...s, cachedAt: Date.now() });
            return s;
        },
        initialData: () => {
            const cached = localStore.get(CACHE_KEY, null);
            // Move the cached server clock forward by the time elapsed on this device, so
            // timers stay correct even when the page is reopened without a connection.
            const elapsed = cached?.cachedAt ? Date.now() - cached.cachedAt : 0;
            return cached
                ? {
                    ...cached,
                    serverNow: new Date(new Date(cached.serverNow).getTime() + elapsed),
                    endsAt: cached.endsAt ? new Date(cached.endsAt) : null,
                    startedAt: cached.startedAt ? new Date(cached.startedAt) : null,
                }
                : undefined;
        },
        initialDataUpdatedAt: 0,
        // Live changes arrive through the realtime signal; no need to refetch on every focus.
        refetchOnWindowFocus: false,
        staleTime: 30000,
    });
}
