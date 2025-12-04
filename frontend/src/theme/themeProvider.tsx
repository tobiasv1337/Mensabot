import React, { createContext, useContext, useCallback, useEffect, useState, useMemo } from "react"
import { lightTheme, darkTheme, type Theme } from "./colors"

type ThemeMode = "light" | "system" | "dark"

interface ThemeContextType {
    mode: ThemeMode;
    currentTheme: Theme;
    toggleMode: (mode: ThemeMode) => void;
    // boolean to indicate if light/dark mode is active and block system changes
    lightMode: boolean;
    darkMode: boolean;
}

const ThemeContext = createContext<ThemeContextType>({ 
    mode: "system", 
    currentTheme: lightTheme, 
    toggleMode: () => {}, 
    lightMode: false, 
    darkMode: false, })

// helper function to get system preference
const getSystemPreference = (): "light" | "dark" => {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
};

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
    // saves button theme value defined by user (default: "system")
    const [mode, setMode] = useState<ThemeMode>("system"); 
    
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
    }, []);

    // logic to determine the active theme based on mode and systemMode
    // blocks system changes when mode is "light" or "dark"
    const activeTheme = useMemo(() => {
        if (mode === "dark") {
            return darkTheme;
        }
        if (mode === "light") {
            return lightTheme;
        }
        return systemMode === "dark" ? darkTheme : lightTheme;
        
    }, [mode, systemMode]);

    const contextValue = useMemo(() => ({
        mode,
        currentTheme: activeTheme,
        toggleMode,
        lightMode: mode === "light" || (mode === "system" && systemMode === "light"),
        darkMode: mode === "dark" || (mode === "system" && systemMode === "dark"),
    }), [mode, systemMode, activeTheme]);

    return (
        <ThemeContext.Provider value={contextValue}>
            {children}
        </ThemeContext.Provider>
    )
};

export const useTheme = () => useContext(ThemeContext)