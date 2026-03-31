import { useCallback, useEffect, useMemo, useState } from "react";

declare global {
  interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  }

  interface Navigator {
    standalone?: boolean;
  }
}

export type InstallCapability =
  | "installed"
  | "native_prompt"
  | "manual_ios_ipados"
  | "manual_macos_safari"
  | "unsupported";

export type InstallPromotionStage = 1 | 2 | 3 | 4 | "stopped";

type StoredInstallPromotionState = {
  successfulChatCount: number;
  countedSessionCount: number;
  lastCountedSessionAt: number | null;
  dismissCount: number;
  lastDismissedAt: number | null;
  lastShownSessionId: string | null;
  accepted: boolean;
};

export type InstallPromotionState = {
  capability: InstallCapability;
  stage: InstallPromotionStage;
  dismissCount: number;
  successfulChatCount: number;
  countedSessionCount: number;
  lastDismissedAt: string | null;
  lastShownSessionId: string | null;
  promptVisible: boolean;
  instructionsOpen: boolean;
  isPromptEligible: boolean;
  canShowProactive: boolean;
  shouldShowPersistentEntry: boolean;
};

const STORAGE_KEY = "mensabot-install-promotion";
const SESSION_WINDOW_MS = 12 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const STAGE_RULES: Record<Exclude<InstallPromotionStage, "stopped">, {
  chats: number;
  sessions: number;
  cooldownMs: number;
}> = {
  1: { chats: 1, sessions: 2, cooldownMs: 0 },
  2: { chats: 5, sessions: 5, cooldownMs: 3 * DAY_MS },
  3: { chats: 12, sessions: 10, cooldownMs: 14 * DAY_MS },
  4: { chats: 25, sessions: 18, cooldownMs: 45 * DAY_MS },
};

const DEFAULT_STATE: StoredInstallPromotionState = {
  successfulChatCount: 0,
  countedSessionCount: 0,
  lastCountedSessionAt: null,
  dismissCount: 0,
  lastDismissedAt: null,
  lastShownSessionId: null,
  accepted: false,
};

const sanitizeNumber = (value: unknown): number | null => {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value;
};

const sanitizeStoredState = (value: unknown): StoredInstallPromotionState => {
  if (!value || typeof value !== "object") return DEFAULT_STATE;
  const raw = value as Record<string, unknown>;

  return {
    successfulChatCount: Math.max(0, sanitizeNumber(raw.successfulChatCount) ?? 0),
    countedSessionCount: Math.max(0, sanitizeNumber(raw.countedSessionCount) ?? 0),
    lastCountedSessionAt: sanitizeNumber(raw.lastCountedSessionAt),
    dismissCount: Math.min(4, Math.max(0, sanitizeNumber(raw.dismissCount) ?? 0)),
    lastDismissedAt: sanitizeNumber(raw.lastDismissedAt),
    lastShownSessionId: typeof raw.lastShownSessionId === "string" ? raw.lastShownSessionId : null,
    accepted: raw.accepted === true,
  };
};

const readStoredState = (): StoredInstallPromotionState => {
  if (typeof window === "undefined") return DEFAULT_STATE;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    return sanitizeStoredState(JSON.parse(raw));
  } catch (error) {
    console.error("Failed to read install promotion state:", error);
    return DEFAULT_STATE;
  }
};

const writeStoredState = (state: StoredInstallPromotionState) => {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error("Failed to persist install promotion state:", error);
  }
};

const getStage = (dismissCount: number): InstallPromotionStage => {
  if (dismissCount >= 4) return "stopped";
  return (dismissCount + 1) as Exclude<InstallPromotionStage, "stopped">;
};

const isStandalone = () =>
  typeof window !== "undefined" &&
  (window.matchMedia?.("(display-mode: standalone)").matches === true || window.navigator.standalone === true);

const isSafariBrowser = (ua: string) =>
  /Safari/i.test(ua) && !/Chrome|Chromium|CriOS|Edg|OPR|FxiOS|Firefox|SamsungBrowser/i.test(ua);

const detectManualCapability = (): Extract<InstallCapability, "manual_ios_ipados" | "manual_macos_safari" | "unsupported"> => {
  if (typeof window === "undefined") return "unsupported";

  const ua = window.navigator.userAgent;
  const platform = window.navigator.platform;
  const maxTouchPoints = window.navigator.maxTouchPoints ?? 0;
  const safari = isSafariBrowser(ua);
  const iosLike = /iPhone|iPad|iPod/i.test(ua) || (platform === "MacIntel" && maxTouchPoints > 1);

  if (safari && iosLike) return "manual_ios_ipados";
  if (safari && /^Mac/i.test(platform)) return "manual_macos_safari";

  return "unsupported";
};

const isStageEligible = (stage: InstallPromotionStage, state: StoredInstallPromotionState, now: number) => {
  if (stage === "stopped") return false;

  const rule = STAGE_RULES[stage];
  const meetsUsageThreshold =
    state.successfulChatCount >= rule.chats || state.countedSessionCount >= rule.sessions;

  if (!meetsUsageThreshold) return false;
  if (rule.cooldownMs === 0) return true;
  if (state.lastDismissedAt === null) return false;

  return now - state.lastDismissedAt >= rule.cooldownMs;
};

type UseInstallPromotionOptions = {
  isOnline: boolean;
  isOnboardingActive: boolean;
};

export const useInstallPromotion = ({
  isOnline,
  isOnboardingActive,
}: UseInstallPromotionOptions) => {
  const [storedState, setStoredState] = useState<StoredInstallPromotionState>(() => readStoredState());
  const [nativePromptEvent, setNativePromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [promptVisible, setPromptVisible] = useState(false);
  const [instructionsOpen, setInstructionsOpen] = useState(false);
  const [manualCapability, setManualCapability] = useState<
    Extract<InstallCapability, "manual_ios_ipados" | "manual_macos_safari" | "unsupported">
  >(() => detectManualCapability());
  const [standalone, setStandalone] = useState(() => isStandalone());

  const updateStoredState = useCallback((updater: (prev: StoredInstallPromotionState) => StoredInstallPromotionState) => {
    setStoredState((prev) => {
      const next = updater(prev);
      writeStoredState(next);
      return next;
    });
  }, []);

  const markInstalled = useCallback(() => {
    setPromptVisible(false);
    setInstructionsOpen(false);
    setNativePromptEvent(null);
    updateStoredState(() => ({
      ...DEFAULT_STATE,
      accepted: true,
    }));
  }, [updateStoredState]);

  useEffect(() => {
    setManualCapability(detectManualCapability());
    setStandalone(isStandalone());
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia?.("(display-mode: standalone)");
    if (!mediaQuery) return undefined;

    const handleChange = () => {
      const nextStandalone = isStandalone();
      setStandalone(nextStandalone);
      if (nextStandalone) {
        markInstalled();
      }
    };

    handleChange();
    mediaQuery.addEventListener("change", handleChange);

    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [markInstalled]);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      const promptEvent = event as BeforeInstallPromptEvent;
      promptEvent.preventDefault();
      setNativePromptEvent(promptEvent);
    };

    const handleInstalled = () => {
      markInstalled();
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, [markInstalled]);

  const markCountedSession = useCallback(() => {
    const now = Date.now();
    updateStoredState((prev) => {
      if (prev.lastCountedSessionAt !== null && now - prev.lastCountedSessionAt < SESSION_WINDOW_MS) {
        return prev;
      }

      return {
        ...prev,
        countedSessionCount: prev.countedSessionCount + 1,
        lastCountedSessionAt: now,
      };
    });
  }, [updateStoredState]);

  const markSuccessfulChat = useCallback(() => {
    updateStoredState((prev) => ({
      ...prev,
      successfulChatCount: prev.successfulChatCount + 1,
    }));
  }, [updateStoredState]);

  const currentSessionId = storedState.countedSessionCount > 0
    ? `session-${storedState.countedSessionCount}`
    : null;

  const stage = useMemo(() => getStage(storedState.dismissCount), [storedState.dismissCount]);
  const installed = storedState.accepted || standalone;

  const capability = useMemo<InstallCapability>(() => {
    if (installed) return "installed";
    if (nativePromptEvent) return "native_prompt";
    return manualCapability;
  }, [installed, manualCapability, nativePromptEvent]);

  const now = Date.now();
  const stageEligible = isStageEligible(stage, storedState, now);
  const hasShownCurrentSession =
    currentSessionId !== null && storedState.lastShownSessionId === currentSessionId;
  const isPromptEligible =
    !installed &&
    capability !== "unsupported" &&
    !isOnboardingActive &&
    isOnline &&
    stageEligible;
  const canShowProactive = isPromptEligible && !hasShownCurrentSession;
  const shouldShowPersistentEntry = !installed && capability !== "unsupported";

  const showPrompt = useCallback(() => {
    if (!canShowProactive || currentSessionId === null) return;

    updateStoredState((prev) => {
      if (prev.lastShownSessionId === currentSessionId) return prev;
      return {
        ...prev,
        lastShownSessionId: currentSessionId,
      };
    });
    setPromptVisible(true);
  }, [canShowProactive, currentSessionId, updateStoredState]);

  const hidePrompt = useCallback(() => {
    setPromptVisible(false);
  }, []);

  const dismissPrompt = useCallback(() => {
    const nowValue = Date.now();
    setPromptVisible(false);
    setInstructionsOpen(false);

    updateStoredState((prev) => ({
      ...prev,
      dismissCount: Math.min(4, prev.dismissCount + 1),
      lastDismissedAt: nowValue,
    }));
  }, [updateStoredState]);

  const openInstructions = useCallback(() => {
    if (capability !== "manual_ios_ipados" && capability !== "manual_macos_safari") return;
    setInstructionsOpen(true);
  }, [capability]);

  const closeInstructions = useCallback(() => {
    setInstructionsOpen(false);
  }, []);

  const promptInstall = useCallback(async () => {
    if (capability === "native_prompt" && nativePromptEvent) {
      setPromptVisible(false);
      try {
        await nativePromptEvent.prompt();
        const choice = await nativePromptEvent.userChoice;
        if (choice.outcome === "accepted") {
          markInstalled();
          return;
        }
      } catch (error) {
        console.error("Failed to prompt for installation:", error);
      } finally {
        setNativePromptEvent(null);
      }
      return;
    }

    if (capability === "manual_ios_ipados" || capability === "manual_macos_safari") {
      openInstructions();
    }
  }, [capability, markInstalled, nativePromptEvent, openInstructions]);

  const state: InstallPromotionState = {
    capability,
    stage,
    dismissCount: storedState.dismissCount,
    successfulChatCount: storedState.successfulChatCount,
    countedSessionCount: storedState.countedSessionCount,
    lastDismissedAt: storedState.lastDismissedAt ? new Date(storedState.lastDismissedAt).toISOString() : null,
    lastShownSessionId: storedState.lastShownSessionId,
    promptVisible,
    instructionsOpen,
    isPromptEligible,
    canShowProactive,
    shouldShowPersistentEntry,
  };

  return {
    state,
    markCountedSession,
    markSuccessfulChat,
    showPrompt,
    hidePrompt,
    dismissPrompt,
    promptInstall,
    openInstructions,
    closeInstructions,
  };
};
