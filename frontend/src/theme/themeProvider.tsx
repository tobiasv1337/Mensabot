import React, { useCallback, useEffect, useState, useMemo } from "react"
import { ThemeProvider as StyledThemeProvider } from "styled-components"
import { themes } from "./colors"
import { ThemeContext, type ThemeMode } from "./themeContext"

// helper function to get system preference
const getSystemPreference = (): "light" | "dark" => {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
};

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
    // saves button theme value defined by user (default: "system")
    const [mode, setMode] = useState<ThemeMode>(() => {
        const stored = localStorage.getItem("theme");
        return (stored as ThemeMode) || "system";
    });

    // systemmode
    const [systemMode, setSystemMode] = useState<"light" | "dark">(() => getSystemPreference());

    // --- System-Theme-Listener ---
    useEffect(() => {
        const mq = window.matchMedia("(prefers-color-scheme: dark)");

        const listener = (e: MediaQueryListEvent) => {
            setSystemMode(e.matches ? "dark" : "light");
        };

        mq.addEventListener("change", listener);
        return () => mq.removeEventListener("change", listener);
    }, []);

    const toggleMode = useCallback((newMode: ThemeMode) => {
        setMode(newMode);
        localStorage.setItem("theme", newMode);
    }, []);

    // logic to determine the active theme based on mode and systemMode
    // blocks system changes when mode is "light" or "dark"
    const activeTheme = useMemo(() => {
        if (mode === "dark") {
            return themes.dark;
        }
        if (mode === "light") {
            return themes.light;
        }
        return systemMode === "dark" ? themes.dark : themes.light;

    }, [mode, systemMode]);

    const contextValue = useMemo(() => ({
        mode,
        currentTheme: activeTheme,
        toggleMode,
        lightMode: mode === "light" || (mode === "system" && systemMode === "light"),
        darkMode: mode === "dark" || (mode === "system" && systemMode === "dark"),
    }), [mode, systemMode, activeTheme, toggleMode]);

    return (
        <ThemeContext.Provider value={contextValue}>
            <StyledThemeProvider theme={activeTheme}>
                {children}
            </StyledThemeProvider>
        </ThemeContext.Provider>
    )
};
