import { useEffect, useState } from "react";

export function useShortcutStorage(key: string) {
    const [shortcuts, setShortcuts] = useState<string[]>(() => {
        try {
            const saved = localStorage.getItem(key);
            const parsed = saved ? JSON.parse(saved) : [];
            return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
        } catch {
            return [];
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem(key, JSON.stringify(shortcuts));
        } catch {
            // ignore
        }
    }, [key, shortcuts]);

    const addShortcut = (label: string) => {
        const clean = label.trim();
        if (!clean) return;

        setShortcuts((prev) => {
            if (prev.includes(clean)) return prev;
            return [...prev, clean]; // same as your old code
        });
    };

    const removeShortcut = (label: string) => {
        setShortcuts((prev) => prev.filter((s) => s !== label));
    };

    return { shortcuts, addShortcut, removeShortcut };
}
