/** localStorage wrapper that never throws (private mode, quota, SSR). */
export const localStore = {
    get(key, fallback) {
        try {
            const raw = window.localStorage.getItem(key);
            return raw == null ? fallback : JSON.parse(raw);
        }
        catch {
            return fallback;
        }
    },
    set(key, value) {
        try {
            window.localStorage.setItem(key, JSON.stringify(value));
        }
        catch { }
    },
    remove(key) {
        try {
            window.localStorage.removeItem(key);
        }
        catch { }
    },
};
