import React, { createContext, useContext, useEffect, useState, useMemo, } from "react";
const listeners = new Set();
function notifyThemeChange() {
    const mode = getCurrentThemeMode();
    listeners.forEach((listener) => listener(mode));
}
function subscribeToThemeChange(listener) {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}
function updateTheme(darkPreferred) {
    if (darkPreferred) {
        document.body.classList.add("dark");
    }
    else {
        document.body.classList.remove("dark");
    }
}
let currentMediaQuery = null;
/**
 * Switch to dark mode by adding the "dark" class to document.body.
 */
export function switchToDarkMode() {
    // Clear any auto mode listener if present.
    if (currentMediaQuery) {
        currentMediaQuery.onchange = null;
        currentMediaQuery = null;
    }
    document.body.classList.add("dark");
    notifyThemeChange();
}
/**
 * Switch to light mode by removing the "dark" class from document.body.
 */
export function switchToLightMode() {
    // Clear any auto mode listener if present.
    if (currentMediaQuery) {
        currentMediaQuery.onchange = null;
        currentMediaQuery = null;
    }
    document.body.classList.remove("dark");
    notifyThemeChange();
}
/**
 * Switch to auto mode. This function immediately applies the user's color scheme preference
 * and listens for system preference changes to update the theme automatically.
 * It uses the onchange property instead of addEventListener to avoid TypeScript issues.
 */
export function switchToAutoMode() {
    if (currentMediaQuery) {
        currentMediaQuery.onchange = null;
    }
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    mediaQuery.onchange = (e) => {
        updateTheme(e.matches);
    };
    currentMediaQuery = mediaQuery;
    updateTheme(mediaQuery.matches);
    notifyThemeChange();
}
/**
 * Returns the current theme mode:
 * - "auto" if auto mode is enabled,
 * - "dark" if the document body has the "dark" class,
 * - "light" otherwise.
 */
export function getCurrentThemeMode() {
    if (currentMediaQuery) {
        return "auto";
    }
    return document.body.classList.contains("dark") ? "dark" : "light";
}
const ThemeModeContext = createContext(null);
export function ThemeModeProvider({ children }) {
    const [mode, setMode] = useState(() => getCurrentThemeMode());
    useEffect(() => {
        // Subscribe to changes triggered by standalone functions
        const unsubscribe = subscribeToThemeChange((newMode) => {
            setMode(newMode);
        });
        return unsubscribe;
    }, []);
    const value = useMemo(() => ({
        mode,
        switchToDarkMode,
        switchToLightMode,
        switchToAutoMode,
    }), [mode]);
    return (<ThemeModeContext.Provider value={value}>
      {children}
    </ThemeModeContext.Provider>);
}
export function useThemeMode() {
    const context = useContext(ThemeModeContext);
    if (!context) {
        throw new Error("useThemeMode must be used within a ThemeModeProvider");
    }
    return context;
}
