import { useEffect, useState } from "react";

export function useShortcutStorage(key: string, defaultValue: string[]) {
    const [shortcuts, setShortcuts] = useState<string[]>(() => {
        const saved = localStorage.getItem(key);
        return saved ? JSON.parse(saved) : defaultValue;
    });

    useEffect(() => {
        localStorage.setItem(key, JSON.stringify(shortcuts));
    }, [key, shortcuts]);

    const addShortcut = (label: string) => {
        const clean = label.trim();
        if (!clean) return;
        if (!shortcuts.includes(clean)) {
            setShortcuts([...shortcuts, clean]);
        }
    };

    const removeShortcut = (label: string) => {
        setShortcuts(shortcuts.filter((s) => s !== label));
    };

    return { shortcuts, addShortcut, removeShortcut };
}
