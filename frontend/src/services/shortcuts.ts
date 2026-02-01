import { useCallback, useState } from "react";
import type { ChatFilters } from "./chats";
import { defaultChatFilters } from "./chats";

export type Shortcut = {
  id: string;
  name: string;
  prompt: string;
  filters: ChatFilters;
  createdAt: string;
  updatedAt: string;
};

export type ShortcutInput = {
  name: string;
  prompt: string;
  filters: ChatFilters;
};

const STORAGE_KEY = "mensabot-shortcuts";

const createId = () =>
  `shortcut-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const normalizeFilters = (filters?: Partial<ChatFilters>): ChatFilters => ({
  diet: filters?.diet ?? defaultChatFilters.diet,
  allergens: Array.isArray(filters?.allergens)
    ? filters?.allergens.filter((item): item is string => typeof item === "string")
    : [],
  canteens: Array.isArray(filters?.canteens) ? filters?.canteens : [],
});

const sanitizeShortcut = (item: unknown): Shortcut | null => {
  if (!item || typeof item !== "object") return null;
  const raw = item as Record<string, unknown>;
  const createdAt = typeof raw.createdAt === "string" ? raw.createdAt : new Date().toISOString();
  const updatedAt = typeof raw.updatedAt === "string" ? raw.updatedAt : createdAt;

  return {
    id: typeof raw.id === "string" ? raw.id : createId(),
    name: typeof raw.name === "string" ? raw.name : "Shortcut",
    prompt: typeof raw.prompt === "string" ? raw.prompt : "",
    filters: normalizeFilters(raw.filters as Partial<ChatFilters>),
    createdAt,
    updatedAt,
  };
};

const readShortcuts = (): Shortcut[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(sanitizeShortcut).filter((item): item is Shortcut => item !== null);
  } catch (error) {
    console.error("Failed to read shortcuts from storage:", error);
    return [];
  }
};

const writeShortcuts = (items: Shortcut[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (error) {
    console.error("Failed to write shortcuts to storage:", error);
  }
};

export const useShortcuts = () => {
  const [shortcuts, setShortcuts] = useState<Shortcut[]>(() => readShortcuts());

  const store = useCallback((updater: (prev: Shortcut[]) => Shortcut[]) => {
    setShortcuts((prev) => {
      const next = updater(prev);
      writeShortcuts(next);
      return next;
    });
  }, []);

  const addShortcut = useCallback(
    (input: ShortcutInput) => {
      const now = new Date().toISOString();
      const nextShortcut: Shortcut = {
        id: createId(),
        name: input.name.trim() || "Neuer Shortcut",
        prompt: input.prompt ?? "",
        filters: normalizeFilters(input.filters),
        createdAt: now,
        updatedAt: now,
      };
      store((prev) => [nextShortcut, ...prev]);
      return nextShortcut;
    },
    [store]
  );

  const updateShortcut = useCallback(
    (id: string, input: ShortcutInput) => {
      const now = new Date().toISOString();
      store((prev) =>
        prev.map((shortcut) =>
          shortcut.id === id
            ? {
                ...shortcut,
                name: input.name.trim() || shortcut.name,
                prompt: input.prompt ?? "",
                filters: normalizeFilters(input.filters),
                updatedAt: now,
              }
            : shortcut
        )
      );
    },
    [store]
  );

  const deleteShortcut = useCallback(
    (id: string) => {
      store((prev) => prev.filter((shortcut) => shortcut.id !== id));
    },
    [store]
  );

  return {
    shortcuts,
    addShortcut,
    updateShortcut,
    deleteShortcut,
  };
};
