import { useRef, useLayoutEffect, useCallback } from "react";
/**
 * Returns a stable callback reference that always calls the latest version of the callback.
 * Preferred over useCallback because it always has access to the latest callback
 * without causing re-renders or needing dependencies.
 */
export function useCallbackRef(callback) {
    const callbackRef = useRef(callback);
    // useLayoutEffect runs in the "Commit Phase"
    // This only happens AFTER React is sure this render is going to the screen.
    useLayoutEffect(() => {
        callbackRef.current = callback;
    });
    return useCallback(((...args) => callbackRef.current?.(...args)), []);
}
