import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Canteen, CanteenSearchResult } from "../../services/api";
import type { ChatStreamEvent } from "../../services/chatStream";
import { getApiClient } from "../../services/apiClient";
import { isJudgeCorrectionEnabled, type ChatMode } from "../../services/chatMode";
import { ChatMessage, type Chat as ChatModel, type ChatFilters, defaultChatFilters } from "../../services/chats";
import type { Shortcut, ShortcutInput } from "../../services/shortcuts";
import ChatBubble, { type MessageAction } from "./ChatBubble";
import ChatStreamingBubble from "./ChatStreamingBubble";
import ChatInput, { type CommandMenuGroup, type CommandMenuItem } from "./ChatInput";
import FiltersEditor from "./FiltersEditor";
import ScrollablePillRow from "./ScrollablePillRow";
import ShortcutModal from "../shortcuts/ShortcutModal";
import AiWarningText from "./AiWarning/AiWarningText";
import mensabotLogo from "../../assets/mensabot-logo-gradient-round.svg";
import { DIET_OPTIONS, PRICE_CATEGORY_OPTIONS, getAllergenLabel, normalizeAllergenList } from "./filterData";
import { useOnboarding } from "./useOnboarding";
import {
  buildSlashInput,
  formatCanteenCommand,
  parseSlashCommand,
  toLocalDateToken,
  toLocalISODate,
  WEEKDAY_LABELS,
} from "./chatCommands";
import { buildMenuMarkdown } from "./chatFormatting";
import { applyStreamEvent, createInitialStreamState, type ActiveStreamState } from "./chatStreamState";
import * as S from "./chat.styles";
import { openGoogleMaps } from "../../services/maps";

const NEAR_BOTTOM_PX = 120;
const DEBOUNCE_DELAY_MS = 280;

type ChatMap<T> = Record<string, T | undefined>;
type ChatStreamUpdate = ActiveStreamState | null | ((prev: ActiveStreamState | null) => ActiveStreamState | null);

const isNearBottom = (el: HTMLDivElement) => {
  const remaining = el.scrollHeight - el.scrollTop - el.clientHeight;
  return remaining <= NEAR_BOTTOM_PX;
};

const updateChatMap = <T,>(state: ChatMap<T>, chatId: string, value: T | null): ChatMap<T> => {
  if (value === null) {
    if (state[chatId] === undefined) return state;
    const next = { ...state };
    delete next[chatId];
    return next;
  }
  return state[chatId] === value ? state : { ...state, [chatId]: value };
};

type ChatProps = {
  chat: ChatModel;
  filters: ChatFilters;
  chatMode: ChatMode;
  onChatModeChange: (mode: ChatMode) => void;
  onFiltersChange: (filters: ChatFilters) => void;
  onStartNewChat: (options?: { preselectedCanteen?: Canteen | null }) => void;
  menuCanteen?: Canteen | null;
  shortcuts: Shortcut[];
  onCreateShortcut: (shortcut: ShortcutInput) => void;
  isOffline?: boolean;
  onSuccessfulChat?: () => void;
  onOnboardingActiveChange?: (active: boolean) => void;
  onComposerHeightChange?: (height: number) => void;
};

const cloneFilters = (filters: ChatFilters): ChatFilters => ({
  diet: filters.diet ?? null,
  allergens: [...filters.allergens],
  canteens: [...filters.canteens],
  priceCategory: filters.priceCategory ?? null,
});

const Chat: React.FC<ChatProps> = ({
  chat,
  filters,
  chatMode,
  onChatModeChange,
  onFiltersChange,
  onStartNewChat,
  menuCanteen = null,
  shortcuts,
  onCreateShortcut,
  isOffline = false,
  onSuccessfulChat,
  onOnboardingActiveChange,
  onComposerHeightChange,
}) => {
  const { t } = useTranslation();
  const client = useMemo(() => getApiClient(), []);
  const scrollRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);
  const composerRef = useRef<HTMLDivElement>(null);

  const [version, setVersion] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sendingByChatId, setSendingByChatId] = useState<ChatMap<true>>({});
  const [showScrollToLatest, setShowScrollToLatest] = useState(false);
  const [streamByChatId, setStreamByChatId] = useState<ChatMap<ActiveStreamState>>({});

  const [inputValue, setInputValue] = useState("");
  const [focusSignal, setFocusSignal] = useState(0);
  const [modeMenuOpen, setModeMenuOpen] = useState(false);
  const [shortcutModalOpen, setShortcutModalOpen] = useState(false);
  const [shortcutDraft, setShortcutDraft] = useState<ShortcutInput>({
    name: "",
    prompt: "",
    filters: defaultChatFilters,
  });

  const [locationPromptHandled, setLocationPromptHandled] = useState(false);
  const [isRequestingLocation, setIsRequestingLocation] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [clarificationHandled, setClarificationHandled] = useState(false);
  const menuRequestId = useRef(0);
  const commandRequestId = useRef(0);
  const modeMenuRef = useRef<HTMLDivElement>(null);
  const initialMenuFetched = useRef(false);
  const resolvedCanteenRef = useRef<{ command: string; canteen: Canteen } | null>(null);
  const streamAcceptedRef = useRef<ChatMap<true>>({});

  const [commandActiveIndex, setCommandActiveIndex] = useState(0);
  const [commandCanteenResults, setCommandCanteenResults] = useState<CanteenSearchResult[]>([]);
  const [commandCanteenLoading, setCommandCanteenLoading] = useState(false);
  const [commandCanteenError, setCommandCanteenError] = useState<string | null>(null);
  const [commandUserLocation, setCommandUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [commandLocationStatus, setCommandLocationStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const modeMenuPopoverId = useId();
  const isSending = Boolean(sendingByChatId[chat.id]);
  const activeStream = streamByChatId[chat.id] ?? null;

  const setChatSending = useCallback(
    (chatId: string, sending: boolean) => {
      setSendingByChatId((prev) => updateChatMap(prev, chatId, sending ? true : null));
    },
    []
  );

  const setChatStream = useCallback(
    (chatId: string, next: ChatStreamUpdate) => {
      setStreamByChatId((prev) => {
        const current = prev[chatId] ?? null;
        const resolved = typeof next === "function" ? next(current) : next;
        return updateChatMap(prev, chatId, resolved);
      });
    },
    []
  );

  const setChatAccepted = useCallback((chatId: string, accepted: boolean) => {
    if (accepted) {
      streamAcceptedRef.current[chatId] = true;
      return;
    }
    delete streamAcceptedRef.current[chatId];
  }, []);

  const updateFilters = useCallback(
    (next: ChatFilters) => {
      onFiltersChange(next);
    },
    [onFiltersChange]
  );

  const onboarding = useOnboarding(chat, updateFilters, () => setVersion((v) => v + 1));

  useEffect(() => {
    onOnboardingActiveChange?.(onboarding.isActive);
  }, [onOnboardingActiveChange, onboarding.isActive]);

  useEffect(() => () => {
    onOnboardingActiveChange?.(false);
  }, [onOnboardingActiveChange]);

  useEffect(() => {
    const node = composerRef.current;
    if (!node) return undefined;

    const reportHeight = () => {
      onComposerHeightChange?.(node.offsetHeight);
    };

    reportHeight();

    const resizeObserver = new ResizeObserver(() => {
      reportHeight();
    });

    resizeObserver.observe(node);
    window.addEventListener("resize", reportHeight);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", reportHeight);
      onComposerHeightChange?.(0);
    };
  }, [onComposerHeightChange]);

  // Start onboarding whenever it hasn't been completed yet
  const onboardingStartedRef = useRef(false);
  useEffect(() => {
    if (onboarding.isActive || onboarding.step !== "idle" || menuCanteen || onboardingStartedRef.current) return;

    onboardingStartedRef.current = true;
    onboarding.startOnboarding();
  }, [chat, menuCanteen, onboarding]);

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, []);

  const updateFiltersPartial = useCallback(
    (partial: Partial<ChatFilters>) => {
      updateFilters({ ...filters, ...partial });
    },
    [filters, updateFilters]
  );

  const handleStartNewChat = useCallback(() => {
    if (isSending) return;
    onStartNewChat();
    setFiltersOpen(false);
    setInputValue("");
    setLocationPromptHandled(false);
    setLocationError("");
    setClarificationHandled(false);
    setShowScrollToLatest(false);
    shouldAutoScrollRef.current = true;
  }, [isSending, onStartNewChat]);

  const fetchAndAppendMenu = useCallback(
    async (canteen: Canteen, targetChat: ChatModel, dateOverride?: string, dateLabel?: string) => {
      const dateText = dateLabel ? t("chat.dateFor", { date: dateLabel }) : t("chat.dateForToday");
      targetChat.addMessage(
        new ChatMessage("user", t("chat.showMenuFor", { name: canteen.name, date: dateText }))
      );
      const requestId = ++menuRequestId.current;
      try {
        const menu = await client.getCanteenMenu(
          canteen.id,
          dateOverride ? { date: dateOverride } : {}
        );
        if (requestId !== menuRequestId.current) return;
        const message = buildMenuMarkdown(canteen, menu);
        shouldAutoScrollRef.current = true;
        targetChat.addMessage(new ChatMessage("assistant", message));
        setVersion((v) => v + 1);
      } catch {
        if (requestId !== menuRequestId.current) return;
        shouldAutoScrollRef.current = true;
        targetChat.addMessage(
          new ChatMessage("assistant", t("chat.menuLoadError"))
        );
        setVersion((v) => v + 1);
      }
    },
    [client, t]
  );

  useEffect(() => {
    if (chat.messages.length > 0) return;
    if (!menuCanteen) return;
    if (!initialMenuFetched.current) {
      initialMenuFetched.current = true;
      fetchAndAppendMenu(menuCanteen, chat);
    }
  }, [chat, menuCanteen, fetchAndAppendMenu]);

  useEffect(() => {
    setFiltersOpen(false);
    setInputValue("");
    setModeMenuOpen(false);
    setLocationPromptHandled(false);
    setLocationError("");
    setClarificationHandled(false);
    setShowScrollToLatest(false);
    shouldAutoScrollRef.current = true;
    onboardingStartedRef.current = false;
    requestAnimationFrame(() => {
      scrollToBottom();
    });
  }, [chat, scrollToBottom]);

  useEffect(() => {
    if (filters.allergens.length === 0) return;
    const normalized = normalizeAllergenList(filters.allergens);
    const changed =
      normalized.length !== filters.allergens.length ||
      normalized.some((value, index) => value !== filters.allergens[index]);
    if (changed) {
      updateFiltersPartial({ allergens: normalized });
    }
  }, [filters.allergens, updateFiltersPartial]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const onScroll = () => {
      const nearBottom = isNearBottom(el);
      shouldAutoScrollRef.current = nearBottom;
      setShowScrollToLatest(!nearBottom);
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    shouldAutoScrollRef.current = true;
    setShowScrollToLatest(false);

    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!modeMenuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (modeMenuRef.current?.contains(event.target as Node)) return;
      setModeMenuOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setModeMenuOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [modeMenuOpen]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    if (shouldAutoScrollRef.current) {
      requestAnimationFrame(() => {
        scrollToBottom();
      });
    }
  }, [version, chat.messages.length, isSending, activeStream, chat.id, scrollToBottom]);

  useEffect(() => {
    const lastMsg = chat.messages[chat.messages.length - 1];
    if (!lastMsg) return;

    if (lastMsg.meta?.kind === "location_prompt") {
      setLocationPromptHandled(false);
      setLocationError("");
      return;
    }

    if (lastMsg.meta?.kind === "clarification_prompt") {
      setClarificationHandled(false);
      return;
    }

    setLocationPromptHandled(true);
    setClarificationHandled(true);
  }, [version, chat]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (isOffline) return;
      if (isSending) return;
      const trimmed = text.trim();
      if (!trimmed) return;
      const requestChatId = chat.id;

      if (trimmed.startsWith("/")) {
        const parsed = parseSlashCommand(trimmed.slice(1));
        if (!parsed.query) return;

        setChatSending(requestChatId, true);
        try {
          const resolved = resolvedCanteenRef.current;
          const normalizedCommand = parsed.rawQuery.trim().toLowerCase();
          if (resolved && normalizedCommand === resolved.command) {
            updateFiltersPartial({ canteens: [resolved.canteen] });
            await fetchAndAppendMenu(resolved.canteen, chat, parsed.dateISO, parsed.dateToken);
            resolvedCanteenRef.current = null;
            return;
          }

          const searchQuery = parsed.rawQuery.includes("_")
            ? parsed.query.replace(/\b(\d)0\b/g, "$1 0")
            : parsed.query;
          const response = await client.searchCanteens({
            query: searchQuery,
            perPage: 1,
            minScore: 0,
            sortBy: "auto",
            nearLat: commandUserLocation?.lat,
            nearLng: commandUserLocation?.lng,
          });

          const selected = response.results[0]?.canteen;
          if (!selected) {
            chat.addMessage(
              new ChatMessage("assistant", t("chat.noCanteenFound"))
            );
            setVersion((v) => v + 1);
            return;
          }

          updateFiltersPartial({ canteens: [selected] });
          await fetchAndAppendMenu(selected, chat, parsed.dateISO, parsed.dateToken);
        } catch {
          chat.addMessage(
            new ChatMessage("assistant", t("chat.canteenLoadError"))
          );
          setVersion((v) => v + 1);
        } finally {
          setChatSending(requestChatId, false);
        }
        return;
      }

      setChatSending(requestChatId, true);
      try {
        shouldAutoScrollRef.current = true;
        setChatAccepted(requestChatId, false);
        setChatStream(requestChatId, createInitialStreamState());
        await chat.send(client, trimmed, {
          includeToolCalls: true,
          judgeCorrection: isJudgeCorrectionEnabled(chatMode),
          onStreamEvent: (event: ChatStreamEvent) => {
            if (event.type === "chat.accepted") setChatAccepted(requestChatId, true);
            setChatStream(requestChatId, (prev) => applyStreamEvent(prev, event));
          },
          onStreamFallback: () => {
            setChatAccepted(requestChatId, false);
            setChatStream(requestChatId, null);
          },
        });
        setChatAccepted(requestChatId, false);
        setChatStream(requestChatId, null);
        onSuccessfulChat?.();
        setVersion((v) => v + 1);
      } catch (err) {
        console.error("Chat send failed:", err);
        if (streamAcceptedRef.current[requestChatId]) {
          setChatStream(requestChatId, (prev) =>
            prev
              ? {
                ...prev,
                error: t("chat.streaming.transportError"),
              }
              : null
          );
        } else {
          setChatAccepted(requestChatId, false);
          setChatStream(requestChatId, null);
          chat.addMessage(
            new ChatMessage(
              "assistant",
              t("chat.serverError")
            )
          );
          setVersion((v) => v + 1);
        }
      } finally {
        setChatSending(requestChatId, false);
      }
    },
    [chat, chatMode, client, isOffline, isSending, commandUserLocation, updateFiltersPartial, fetchAndAppendMenu, onSuccessfulChat, setChatAccepted, setChatSending, setChatStream, t]
  );

  const handleTranscribeAudio = useCallback(
    async (audio: Blob) => {
      const res = await client.transcribeAudio(audio);
      return res.text;
    },
    [client]
  );

  const handleShareLocation = useCallback(() => {
    if (isSending || isRequestingLocation) return;
    if (!("geolocation" in navigator)) {
      setLocationError(t("chat.geoNotSupported"));
      return;
    }

    setLocationError("");
    setIsRequestingLocation(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        // `lng` is reserved by i18next for language override, so use `lon` for interpolation.
        const coordsMessage = t("chat.myLocation", { lat: latitude.toFixed(6), lon: longitude.toFixed(6) });
        await sendMessage(coordsMessage);
        setLocationPromptHandled(true);
        setIsRequestingLocation(false);
      },
      (geoError) => {
        console.error("Geolocation error", geoError);
        setLocationError(t("chat.geoFailed"));
        setIsRequestingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }, [isSending, isRequestingLocation, sendMessage, t]);

  const handleSelfLocation = useCallback(() => {
    if (isSending || isRequestingLocation) return;
    setLocationError("");
    chat.addMessage(
      new ChatMessage(
        "assistant",
        t("chat.selfLocationPrompt"),
        { kind: "normal" }
      )
    );
    setLocationPromptHandled(true);
    setVersion((v) => v + 1);
  }, [chat, isSending, isRequestingLocation, t]);

  const handleOpenDirections = useCallback(
    (message: ChatMessage) => {
      if (isSending) return;
      const directions = message.meta.directions;
      if (!directions) return;

      const { lat, lng } = directions;
      if (typeof lat !== "number" || typeof lng !== "number") return;
      openGoogleMaps(lat, lng);
    },
    [isSending]
  );

  const handleClarificationSelect = useCallback(
    (option: string) => {
      if (isSending) return;
      setClarificationHandled(true);
      void sendMessage(option);
    },
    [isSending, sendMessage]
  );

  const handleResetFilters = useCallback(() => {
    updateFilters(defaultChatFilters);
  }, [updateFilters]);

  const handleSelectMode = useCallback((mode: ChatMode) => {
    onChatModeChange(mode);
    setModeMenuOpen(false);
  }, [onChatModeChange]);

  const hasActiveFilters =
    filters.diet !== null || filters.allergens.length > 0 || filters.canteens.length > 0 || filters.priceCategory !== null;

  const activeFilterItems = [
    ...(filters.priceCategory
      ? [
        {
          key: `price-${filters.priceCategory}`,
          label: PRICE_CATEGORY_OPTIONS.find((option) => option.value === filters.priceCategory)?.label ?? t("chat.filters.priceCategory"),
          onRemove: () => updateFiltersPartial({ priceCategory: null }),
        },
      ]
      : []),
    ...(filters.diet
      ? [
        {
          key: `diet-${filters.diet}`,
          label: DIET_OPTIONS.find((option) => option.value === filters.diet)?.label ?? t("chat.filters.diet"),
          onRemove: () => updateFiltersPartial({ diet: null }),
        },
      ]
      : []),
    ...filters.allergens.map((allergenKey) => ({
      key: `allergen-${allergenKey}`,
      label: getAllergenLabel(allergenKey),
      onRemove: () =>
        updateFiltersPartial({
          allergens: filters.allergens.filter((item) => item !== allergenKey),
        }),
    })),
    ...filters.canteens.map((canteen) => ({
      key: `canteen-${canteen.id}`,
      label: canteen.name,
      onRemove: () =>
        updateFiltersPartial({
          canteens: filters.canteens.filter((item) => item.id !== canteen.id),
        }),
    })),
  ];

  const handleScrollToLatest = () => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    shouldAutoScrollRef.current = true;
    setShowScrollToLatest(false);
  };

  const handleOpenShortcutModal = useCallback(() => {
    setShortcutDraft({
      name: "",
      prompt: inputValue,
      filters: cloneFilters(filters),
    });
    setShortcutModalOpen(true);
  }, [filters, inputValue]);

  const handleSaveShortcut = useCallback(
    (draft: ShortcutInput) => {
      onCreateShortcut({
        name: draft.name.trim(),
        prompt: draft.prompt,
        filters: cloneFilters(draft.filters),
      });
      setShortcutModalOpen(false);
    },
    [onCreateShortcut]
  );

  const handleApplyShortcut = useCallback(
    (shortcut: Shortcut) => {
      updateFilters(cloneFilters(shortcut.filters));
      setFiltersOpen(false);
      setInputValue(shortcut.prompt);
      setFocusSignal((prev) => prev + 1);
    },
    [updateFilters]
  );

  const slashState = useMemo(() => {
    const trimmed = inputValue.trimStart();
    if (!trimmed.startsWith("/")) return null;
    const raw = trimmed.slice(1);
    const parsed = parseSlashCommand(raw);
    return {
      raw,
      rawQuery: parsed.rawQuery,
      normalized: parsed.query,
      dateISO: parsed.dateISO,
      dateToken: parsed.dateToken,
    };
  }, [inputValue]);

  const slashActive = Boolean(slashState);
  const slashQuery = slashState?.normalized ?? "";
  const slashDateToken = slashState?.dateToken;
  const slashRawQuery = slashState?.rawQuery ?? "";
  const shortcutQuery = slashQuery.toLowerCase();
  const isResolvedSlashCommand = useMemo(
    () => slashRawQuery.trim().toLowerCase().startsWith("mensa_"),
    [slashRawQuery]
  );

  const commandCaptureEnter = !slashDateToken;

  const requestSlashLocation = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setCommandLocationStatus("error");
      return;
    }

    setCommandLocationStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCommandUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
        setCommandLocationStatus("ready");
      },
      () => {
        setCommandLocationStatus("error");
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }, []);

  useEffect(() => {
    if (!slashActive || slashQuery.length === 0) return;
    if (commandLocationStatus !== "idle") return;
    requestSlashLocation();
  }, [slashActive, slashQuery, commandLocationStatus, requestSlashLocation]);

  useEffect(() => {
    if (!slashActive || isResolvedSlashCommand) {
      commandRequestId.current += 1;
      setCommandCanteenResults([]);
      setCommandCanteenLoading(false);
      setCommandCanteenError(null);
      return;
    }

    const timer = window.setTimeout(async () => {
      const requestId = ++commandRequestId.current;
      setCommandCanteenLoading(true);
      setCommandCanteenError(null);
      setCommandCanteenResults([]);

      try {
        const response = await client.searchCanteens({
          query: slashQuery,
          perPage: 10,
          minScore: 0,
          sortBy: "auto",
          nearLat: commandUserLocation?.lat,
          nearLng: commandUserLocation?.lng,
        });

        if (requestId !== commandRequestId.current) return;
        setCommandCanteenResults(response.results);
      } catch {
        if (requestId !== commandRequestId.current) return;
        setCommandCanteenError(t("chat.command.canteenSearchError"));
      } finally {
        if (requestId === commandRequestId.current) {
          setCommandCanteenLoading(false);
        }
      }
    }, DEBOUNCE_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [slashActive, slashQuery, isResolvedSlashCommand, client, commandUserLocation, t]);

  useEffect(() => {
    if (!slashActive) {
      setCommandActiveIndex(0);
      return;
    }
    setCommandActiveIndex(0);
  }, [slashActive, slashQuery]);

  const filteredShortcuts = useMemo(() => {
    if (!slashActive) return [];
    if (!shortcutQuery) return shortcuts;
    return shortcuts.filter((shortcut) => shortcut.name.toLowerCase().includes(shortcutQuery));
  }, [slashActive, shortcutQuery, shortcuts]);

  const describeShortcut = useCallback((shortcut: Shortcut) => {
    const prompt = shortcut.prompt.trim();
    if (prompt) {
      return prompt.length > 80 ? `${prompt.slice(0, 77)}...` : prompt;
    }
    const parts: string[] = [];
    if (shortcut.filters.priceCategory) parts.push(t("chat.describe.priceCategory", { value: PRICE_CATEGORY_OPTIONS.find((o) => o.value === shortcut.filters.priceCategory)?.label ?? shortcut.filters.priceCategory }));
    if (shortcut.filters.diet) parts.push(t("chat.describe.diet", { value: shortcut.filters.diet }));
    if (shortcut.filters.allergens.length > 0) parts.push(t("chat.describe.allergens", { count: shortcut.filters.allergens.length }));
    if (shortcut.filters.canteens.length > 0) parts.push(t("chat.describe.canteens", { count: shortcut.filters.canteens.length }));
    return parts.length > 0 ? parts.join(" · ") : t("chat.describe.savedShortcut");
  }, [t]);

  const shortcutItems: CommandMenuItem[] = useMemo(
    () =>
      filteredShortcuts.map((shortcut) => ({
        id: `shortcut-${shortcut.id}`,
        label: shortcut.name,
        meta: describeShortcut(shortcut),
        kind: "shortcut",
        payload: shortcut,
      })),
    [filteredShortcuts, describeShortcut]
  );

  const canteenItems: CommandMenuItem[] = useMemo(
    () =>
      commandCanteenResults.map((result) => {
        const metaParts = [result.canteen.city].filter(Boolean);
        if (result.distance_km != null) {
          metaParts.push(`${result.distance_km.toFixed(1)} km`);
        }
        return {
          id: `canteen-${result.canteen.id}`,
          label: result.canteen.name,
          meta: metaParts.join(" · "),
          kind: "canteen",
          payload: result.canteen,
        };
      }),
    [commandCanteenResults]
  );

  const dateItems: CommandMenuItem[] = useMemo(() => {
    const today = new Date();
    const baseDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const items: CommandMenuItem[] = [];

    for (let index = 0; index < 7; index += 1) {
      const date = new Date(baseDate);
      date.setDate(baseDate.getDate() + index);
      const dateToken = toLocalDateToken(date);
      const dateISO = toLocalISODate(date);
      let label = WEEKDAY_LABELS[date.getDay()];
      let token = dateToken;

      if (index === 0) {
        label = t("chat.command.today");
        token = "heute";
      } else if (index === 1) {
        label = t("chat.command.tomorrow");
        token = "morgen";
      } else if (index === 2) {
        label = t("chat.command.dayAfterTomorrow");
        token = "übermorgen";
      }

      items.push({
        id: `date-${dateISO}`,
        label,
        meta: dateToken,
        kind: "date",
        payload: token,
      });
    }

    return items;
  }, [t]);

  const commandGroups: CommandMenuGroup[] = useMemo(() => {
    if (!slashActive) return [];

    if (isResolvedSlashCommand) {
      return [
        {
          id: "dates",
          label: t("chat.command.dateLabel"),
          items: dateItems,
        },
      ];
    }

    const shortcutEmptyLabel = shortcuts.length === 0
      ? t("chat.command.noShortcutsSaved")
      : shortcutQuery
        ? t("chat.command.noMatchingShortcuts")
        : t("chat.command.noShortcutsAvailable");

    let canteenEmptyLabel = t("chat.command.typeToSearch");
    if (slashQuery.length > 0) {
      if (commandCanteenLoading) {
        canteenEmptyLabel = t("chat.command.searching");
      } else if (commandCanteenError) {
        canteenEmptyLabel = commandCanteenError;
      } else if (canteenItems.length === 0) {
        canteenEmptyLabel = t("chat.command.noCanteensFound");
      }
    }

    return [
      {
        id: "shortcuts",
        label: t("chat.command.shortcutsLabel"),
        items: shortcutItems,
        emptyLabel: shortcutItems.length === 0 ? shortcutEmptyLabel : undefined,
      },
      {
        id: "canteens",
        label: t("chat.command.canteensLabel"),
        items: canteenItems,
        emptyLabel: canteenItems.length === 0 ? canteenEmptyLabel : undefined,
      },
    ];
  }, [
    slashActive,
    isResolvedSlashCommand,
    shortcutQuery,
    shortcuts.length,
    slashQuery.length,
    shortcutItems,
    canteenItems,
    dateItems,
    commandCanteenLoading,
    commandCanteenError,
    t,
  ]);

  const flatCommandItems = useMemo(
    () => commandGroups.flatMap((group) => group.items),
    [commandGroups]
  );

  useEffect(() => {
    if (!slashActive) return;
    if (flatCommandItems.length === 0) {
      setCommandActiveIndex(0);
      return;
    }
    if (commandActiveIndex >= flatCommandItems.length) {
      setCommandActiveIndex(0);
    }
  }, [slashActive, flatCommandItems.length, commandActiveIndex]);

  const activeCommandItem = flatCommandItems[commandActiveIndex];
  const activeCommandId = activeCommandItem?.id;

  const handleCommandNavigate = useCallback(
    (direction: "next" | "prev") => {
      if (flatCommandItems.length === 0) return;
      setCommandActiveIndex((prev) => {
        const next = direction === "next" ? prev + 1 : prev - 1;
        if (next < 0) return flatCommandItems.length - 1;
        if (next >= flatCommandItems.length) return 0;
        return next;
      });
    },
    [flatCommandItems.length]
  );

  const handleCommandSelect = useCallback(
    (item: CommandMenuItem) => {
      if (item.kind === "shortcut") {
        handleApplyShortcut(item.payload as Shortcut);
        return;
      }

      if (item.kind === "canteen") {
        const canteen = item.payload as Canteen;
        const commandBase = formatCanteenCommand(canteen.name);
        setInputValue(
          buildSlashInput(commandBase, slashDateToken, { trailingSpace: !slashDateToken })
        );
        setFocusSignal((prev) => prev + 1);
        resolvedCanteenRef.current = { command: commandBase, canteen };
        return;
      }

      if (item.kind === "date") {
        const token = String(item.payload ?? "").trim();
        const base = slashRawQuery.trim();
        if (!base) return;
        const commandText = buildSlashInput(base, token);
        setInputValue("");
        setFocusSignal((prev) => prev + 1);
        void sendMessage(commandText);
      }
    },
    [handleApplyShortcut, slashDateToken, slashRawQuery, sendMessage]
  );

  const handleCommandClose = useCallback(() => {
    setInputValue("");
    setFocusSignal((prev) => prev + 1);
    resolvedCanteenRef.current = null;
  }, []);

  const commandMenu = slashActive
    ? {
      open: true,
      groups: commandGroups,
      activeId: activeCommandId,
      activeItem: activeCommandItem,
      onSelect: handleCommandSelect,
      onNavigate: handleCommandNavigate,
      onClose: handleCommandClose,
      captureEnter: commandCaptureEnter,
    }
    : undefined;

  const showWelcomeMessage = chat.messages.length === 0 && !menuCanteen && onboarding.step === "done";
  const activeModeLabel = chatMode === "fast" ? t("chat.mode.fast") : t("chat.mode.reliable");
  const activeModeDescription = chatMode === "fast" ? t("chat.mode.fastDescription") : t("chat.mode.reliableDescription");
  const modeOptions: { value: ChatMode; label: string; description: string }[] = [
    { value: "reliable", label: t("chat.mode.reliable"), description: t("chat.mode.reliableDescription") },
    { value: "fast", label: t("chat.mode.fast"), description: t("chat.mode.fastDescription") },
  ];

  return (
    <S.ChatShell>
      <S.HeaderCard>
        <S.ModeMenu ref={modeMenuRef}>
          <S.ModeMenuButton
            type="button"
            onClick={() => setModeMenuOpen((open) => !open)}
            disabled={isSending}
            aria-label={t("chat.mode.label")}
            aria-expanded={modeMenuOpen}
            aria-controls={modeMenuOpen ? modeMenuPopoverId : undefined}
            title={activeModeDescription}
          >
            <S.ModeMenuLabel>{activeModeLabel}</S.ModeMenuLabel>
            <S.ModeMenuCaret $open={modeMenuOpen}>▾</S.ModeMenuCaret>
          </S.ModeMenuButton>
          {modeMenuOpen && (
            <S.ModeMenuPopover id={modeMenuPopoverId} role="group" aria-label={t("chat.mode.label")}>
              {modeOptions.map((option) => (
                <S.ModeMenuItem
                  key={option.value}
                  type="button"
                  $selected={chatMode === option.value}
                  onClick={() => handleSelectMode(option.value)}
                  aria-pressed={chatMode === option.value}
                >
                  <S.ModeMenuItemText>
                    <S.ModeMenuItemLabel>{option.label}</S.ModeMenuItemLabel>
                    <S.ModeMenuItemMeta>{option.description}</S.ModeMenuItemMeta>
                  </S.ModeMenuItemText>
                  <S.ModeMenuItemCheck aria-hidden="true">{chatMode === option.value ? "✓" : ""}</S.ModeMenuItemCheck>
                </S.ModeMenuItem>
              ))}
            </S.ModeMenuPopover>
          )}
        </S.ModeMenu>
        <S.HeaderActions>
          <S.IconButton
            type="button"
            $variant="ghost"
            onClick={() => setFiltersOpen((prev) => !prev)}
            title={filtersOpen ? t("chat.filterClose") : t("chat.filterOpen")}
            aria-label={filtersOpen ? t("chat.filterClose") : t("chat.filterOpen")}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M3 5h18L14 13v6l-4 2v-8L3 5z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <S.IconButtonLabel>{filtersOpen ? t("chat.filterClose") : t("chat.filter")}</S.IconButtonLabel>
          </S.IconButton>
          {hasActiveFilters && (
            <S.IconButton
              type="button"
              $variant="ghost"
              onClick={handleResetFilters}
              title={t("chat.resetFilters")}
              aria-label={t("chat.resetFilters")}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M21 12a9 9 0 1 1-2.64-6.36"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
                <path
                  d="M21 3v6h-6"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <S.IconButtonLabel>{t("chat.resetFilters")}</S.IconButtonLabel>
            </S.IconButton>
          )}
          <S.IconButton
            type="button"
            $variant="primary"
            onClick={handleStartNewChat}
            disabled={isSending}
            title={t("chat.newChat")}
            aria-label={t("chat.newChat")}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 5v14M5 12h14"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
            <S.IconButtonLabel>{t("chat.newChat")}</S.IconButtonLabel>
          </S.IconButton>
        </S.HeaderActions>
      </S.HeaderCard>

      {!filtersOpen && activeFilterItems.length > 0 && (
        <ScrollablePillRow component={S.ActiveFiltersRow}>
          {activeFilterItems.map((item) => (
            <S.PillButton key={item.key} type="button" $selected $removable onClick={item.onRemove}>
              <S.PillRemove>×</S.PillRemove>
              {item.label}
            </S.PillButton>
          ))}
        </ScrollablePillRow>
      )}

      <S.FilterCard $open={filtersOpen}>
        <S.FilterBody>
          <FiltersEditor filters={filters} onChange={updateFilters} client={client} />
        </S.FilterBody>
      </S.FilterCard>

      <S.MessagesCard>
        <S.MessagesScroll ref={scrollRef}>
          <S.MessageList>
            {showWelcomeMessage && (
              <ChatBubble
                message={new ChatMessage("assistant", t("chat.welcome"))}
                avatarSrc={mensabotLogo}
              />
            )}
            {chat.messages.map((message, index) => {
              const isLast = index === chat.messages.length - 1;
              const isOnboardingMsg = message.meta.kind === "onboarding";
              const shouldShowLocationActions =
                message.meta.kind === "location_prompt" && isLast && !locationPromptHandled;
              const shouldShowDirectionsActions =
                message.meta.kind === "directions_prompt";
              const shouldShowClarificationActions =
                message.meta.kind === "clarification_prompt" && isLast && !clarificationHandled;

              const onboardingActions = isOnboardingMsg
                ? onboarding.getActions(index, chat.messages.length)
                : [];

              const clarificationActions: MessageAction[] = shouldShowClarificationActions
                ? [
                  ...(message.meta.clarification?.options ?? []).map((option, optIdx) => ({
                    id: `clarification-${optIdx}`,
                    label: option,
                    onClick: () => handleClarificationSelect(option),
                    disabled: isSending,
                  })),
                  ...(message.meta.clarification?.allow_none !== false
                    ? [
                      {
                        id: "clarification-none",
                        label: t("chat.clarificationNone"),
                        onClick: () => handleClarificationSelect(t("chat.clarificationNone")),
                        variant: "secondary" as const,
                        disabled: isSending,
                      },
                    ]
                    : []),
                ]
                : [];

              const actions: MessageAction[] = onboardingActions.length > 0
                ? onboardingActions
                : shouldShowLocationActions
                ? [
                  {
                    id: "share-location",
                    label: isRequestingLocation ? t("chat.shareLocationLoading") : t("chat.shareLocation"),
                    onClick: handleShareLocation,
                    disabled: isSending || isRequestingLocation,
                  },
                  {
                    id: "manual-location",
                    label: t("chat.manualLocation"),
                    onClick: handleSelfLocation,
                    variant: "secondary",
                    disabled: isSending || isRequestingLocation,
                  },
                ]
                  : shouldShowDirectionsActions
                    ? [
                      {
                        id: "open-directions",
                        label: t("chat.openRoute"),
                        onClick: () => handleOpenDirections(message),
                        disabled: isSending,
                      },
                    ]
                    : shouldShowClarificationActions
                      ? clarificationActions
                      : [];

              const actionsNote = shouldShowLocationActions
                ? locationError || undefined
                : undefined;

              return (
                <ChatBubble
                  key={`${chat.id}-${index}`}
                  message={message}
                  avatarSrc={mensabotLogo}
                  actions={actions}
                  actionsNote={actionsNote}
                />
              );
            })}

            {activeStream ? (
              <ChatStreamingBubble stream={activeStream} avatarSrc={mensabotLogo} />
            ) : isSending ? (
              <S.MessageRow>
                <S.Avatar src={mensabotLogo} alt={t("chat.nameBot")} />
                <S.MessageContent>
                  <S.NameTag>{t("chat.nameBot")}</S.NameTag>
                  <S.TypingBubble $isUser={false}>
                    <S.TypingDot />
                    <S.TypingDot />
                    <S.TypingDot />
                  </S.TypingBubble>
                </S.MessageContent>
              </S.MessageRow>
            ) : null}

          </S.MessageList>
        </S.MessagesScroll>
        {showScrollToLatest && (
          <S.ScrollToLatest type="button" onClick={handleScrollToLatest} aria-label={t("chat.scrollToLatest")}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M6 9l6 6 6-6"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </S.ScrollToLatest>
        )}
      </S.MessagesCard>
      <S.ComposerCard ref={composerRef}>
        <ChatInput
          value={inputValue}
          onChange={setInputValue}
          onSend={sendMessage}
          onTranscribeAudio={handleTranscribeAudio}
          maxVoiceSeconds={180}
          disabled={isOffline || isSending || onboarding.isActive}
          placeholder={
            isOffline
              ? t("chat.input.offlineDisabled")
              : isSending
                ? t("chat.input.sending")
                : onboarding.isActive
                  ? t("chat.onboarding.inputDisabled")
                  : undefined
          }
          shortcuts={shortcuts}
          onShortcutAdd={handleOpenShortcutModal}
          onShortcutSelect={handleApplyShortcut}
          focusSignal={focusSignal}
          commandMenu={commandMenu}
        />
        <AiWarningText />
      </S.ComposerCard>
      {shortcutModalOpen && (
        <ShortcutModal
          isOpen={shortcutModalOpen}
          mode="create"
          value={shortcutDraft}
          onChange={setShortcutDraft}
          client={client}
          onCancel={() => setShortcutModalOpen(false)}
          onSave={handleSaveShortcut}
        />
      )}
    </S.ChatShell>
  );
};

export default Chat;
