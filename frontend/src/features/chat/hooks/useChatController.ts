import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { getApiClient } from "@/shared/api/getApiClient";
import type { Canteen, CanteenSearchResult } from "@/shared/api/MensaBotClient";
import { openGoogleMaps } from "@/shared/services/maps";
import type { ChatStreamEvent } from "../../../services/chatStream";
import { isJudgeCorrectionEnabled, type ChatMode } from "../../../services/chatMode";
import { ChatMessage, type Chat as ChatModel, type ChatFilters, defaultChatFilters } from "../../../services/chats";
import type { Shortcut, ShortcutInput } from "../../../services/shortcuts";
import type { CommandMenuGroup, CommandMenuItem } from "../../../components/chat/ChatInput";
import { DIET_OPTIONS, PRICE_CATEGORY_OPTIONS, getAllergenLabel, normalizeAllergenList } from "../../../components/chat/filterData";
import {
  buildSlashInput,
  formatCanteenCommand,
  parseSlashCommand,
  toLocalDateToken,
  toLocalISODate,
  WEEKDAY_LABELS,
} from "../../../components/chat/chatCommands";
import { buildMenuMarkdown } from "../../../components/chat/chatFormatting";
import { applyStreamEvent, createInitialStreamState, type ActiveStreamState } from "../../../components/chat/chatStreamState";

const DEBOUNCE_DELAY_MS = 280;

type ChatMap<T> = Record<string, T | undefined>;
type ChatStreamUpdate = ActiveStreamState | null | ((prev: ActiveStreamState | null) => ActiveStreamState | null);

type UseChatControllerArgs = {
  chat: ChatModel;
  filters: ChatFilters;
  chatMode: ChatMode;
  onChatModeChange: (mode: ChatMode) => void;
  onFiltersChange: (filters: ChatFilters) => void;
  onStartNewChat: (options?: { preselectedCanteen?: Canteen | null }) => void;
  menuCanteen: Canteen | null;
  shortcuts: Shortcut[];
  onCreateShortcut: (shortcut: ShortcutInput) => void;
  isOffline: boolean;
  onSuccessfulChat?: () => void;
  requestAutoScroll: () => void;
};

type ActiveFilterItem = {
  key: string;
  label: string;
  onRemove: () => void;
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

const cloneFilters = (filters: ChatFilters): ChatFilters => ({
  diet: filters.diet ?? null,
  allergens: [...filters.allergens],
  canteens: [...filters.canteens],
  priceCategory: filters.priceCategory ?? null,
});

export const useChatController = ({
  chat,
  filters,
  chatMode,
  onChatModeChange,
  onFiltersChange,
  onStartNewChat,
  menuCanteen,
  shortcuts,
  onCreateShortcut,
  isOffline,
  onSuccessfulChat,
  requestAutoScroll,
}: UseChatControllerArgs) => {
  const { t } = useTranslation();
  const client = useMemo(() => getApiClient(), []);

  const [version, setVersion] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sendingByChatId, setSendingByChatId] = useState<ChatMap<true>>({});
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
  const [commandActiveIndex, setCommandActiveIndex] = useState(0);
  const [commandCanteenResults, setCommandCanteenResults] = useState<CanteenSearchResult[]>([]);
  const [commandCanteenLoading, setCommandCanteenLoading] = useState(false);
  const [commandCanteenError, setCommandCanteenError] = useState<string | null>(null);
  const [commandUserLocation, setCommandUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [commandLocationStatus, setCommandLocationStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");

  const menuRequestId = useRef(0);
  const commandRequestId = useRef(0);
  const modeMenuRef = useRef<HTMLDivElement>(null);
  const initialMenuFetched = useRef(false);
  const resolvedCanteenRef = useRef<{ command: string; canteen: Canteen } | null>(null);
  const streamAcceptedRef = useRef<ChatMap<true>>({});
  const modeMenuPopoverId = useId();

  const isSending = Boolean(sendingByChatId[chat.id]);
  const activeStream = streamByChatId[chat.id] ?? null;

  const setChatSending = useCallback((chatId: string, sending: boolean) => {
    setSendingByChatId((prev) => updateChatMap(prev, chatId, sending ? true : null));
  }, []);

  const setChatStream = useCallback((chatId: string, next: ChatStreamUpdate) => {
    setStreamByChatId((prev) => {
      const current = prev[chatId] ?? null;
      const resolved = typeof next === "function" ? next(current) : next;
      return updateChatMap(prev, chatId, resolved);
    });
  }, []);

  const setChatAccepted = useCallback((chatId: string, accepted: boolean) => {
    if (accepted) {
      streamAcceptedRef.current[chatId] = true;
      return;
    }

    delete streamAcceptedRef.current[chatId];
  }, []);

  const bumpVersion = useCallback(() => {
    setVersion((current) => current + 1);
  }, []);

  const updateFilters = useCallback(
    (next: ChatFilters) => {
      onFiltersChange(next);
    },
    [onFiltersChange],
  );

  const updateFiltersPartial = useCallback(
    (partial: Partial<ChatFilters>) => {
      updateFilters({ ...filters, ...partial });
    },
    [filters, updateFilters],
  );

  const fetchAndAppendMenu = useCallback(
    async (canteen: Canteen, targetChat: ChatModel, dateOverride?: string, dateLabel?: string) => {
      const dateText = dateLabel ? t("chat.dateFor", { date: dateLabel }) : t("chat.dateForToday");
      requestAutoScroll();
      targetChat.addMessage(
        new ChatMessage("user", t("chat.showMenuFor", { name: canteen.name, date: dateText })),
      );

      const requestId = ++menuRequestId.current;

      try {
        const menu = await client.getCanteenMenu(canteen.id, dateOverride ? { date: dateOverride } : {});
        if (requestId !== menuRequestId.current) return;

        requestAutoScroll();
        targetChat.addMessage(new ChatMessage("assistant", buildMenuMarkdown(canteen, menu)));
        bumpVersion();
      } catch {
        if (requestId !== menuRequestId.current) return;

        requestAutoScroll();
        targetChat.addMessage(new ChatMessage("assistant", t("chat.menuLoadError")));
        bumpVersion();
      }
    },
    [bumpVersion, client, requestAutoScroll, t],
  );

  useEffect(() => {
    if (!modeMenuOpen) return undefined;

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
    if (chat.messages.length > 0 || !menuCanteen) return;
    if (initialMenuFetched.current) return;

    initialMenuFetched.current = true;
    void fetchAndAppendMenu(menuCanteen, chat);
  }, [chat, fetchAndAppendMenu, menuCanteen]);

  useEffect(() => {
    initialMenuFetched.current = false;
    setFiltersOpen(false);
    setInputValue("");
    setModeMenuOpen(false);
    setLocationPromptHandled(false);
    setLocationError("");
    setClarificationHandled(false);
    resolvedCanteenRef.current = null;
  }, [chat.id]);

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
    const lastMessage = chat.messages[chat.messages.length - 1];
    if (!lastMessage) return;

    if (lastMessage.meta?.kind === "location_prompt") {
      setLocationPromptHandled(false);
      setLocationError("");
      return;
    }

    if (lastMessage.meta?.kind === "clarification_prompt") {
      setClarificationHandled(false);
      return;
    }

    setLocationPromptHandled(true);
    setClarificationHandled(true);
  }, [chat, version]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (isOffline || isSending) return;

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
            requestAutoScroll();
            chat.addMessage(new ChatMessage("assistant", t("chat.noCanteenFound")));
            bumpVersion();
            return;
          }

          updateFiltersPartial({ canteens: [selected] });
          await fetchAndAppendMenu(selected, chat, parsed.dateISO, parsed.dateToken);
        } catch {
          requestAutoScroll();
          chat.addMessage(new ChatMessage("assistant", t("chat.canteenLoadError")));
          bumpVersion();
        } finally {
          setChatSending(requestChatId, false);
        }

        return;
      }

      setChatSending(requestChatId, true);

      try {
        requestAutoScroll();
        setChatAccepted(requestChatId, false);
        setChatStream(requestChatId, createInitialStreamState());

        await chat.send(client, trimmed, {
          includeToolCalls: true,
          judgeCorrection: isJudgeCorrectionEnabled(chatMode),
          onStreamEvent: (event: ChatStreamEvent) => {
            if (event.type === "chat.accepted") {
              setChatAccepted(requestChatId, true);
            }

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
        bumpVersion();
      } catch (error) {
        console.error("Chat send failed:", error);

        if (streamAcceptedRef.current[requestChatId]) {
          setChatStream(requestChatId, (prev) =>
            prev
              ? {
                  ...prev,
                  error: t("chat.streaming.transportError"),
                }
              : null,
          );
        } else {
          setChatAccepted(requestChatId, false);
          setChatStream(requestChatId, null);
          requestAutoScroll();
          chat.addMessage(new ChatMessage("assistant", t("chat.serverError")));
          bumpVersion();
        }
      } finally {
        setChatSending(requestChatId, false);
      }
    },
    [
      bumpVersion,
      chat,
      chatMode,
      client,
      commandUserLocation?.lat,
      commandUserLocation?.lng,
      fetchAndAppendMenu,
      isOffline,
      isSending,
      onSuccessfulChat,
      requestAutoScroll,
      setChatAccepted,
      setChatSending,
      setChatStream,
      t,
      updateFiltersPartial,
    ],
  );

  const handleTranscribeAudio = useCallback(
    async (audio: Blob) => {
      const response = await client.transcribeAudio(audio);
      return response.text;
    },
    [client],
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
        const coordsMessage = t("chat.myLocation", {
          lat: latitude.toFixed(6),
          lon: longitude.toFixed(6),
        });

        await sendMessage(coordsMessage);
        setLocationPromptHandled(true);
        setIsRequestingLocation(false);
      },
      (geoError) => {
        console.error("Geolocation error", geoError);
        setLocationError(t("chat.geoFailed"));
        setIsRequestingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }, [isRequestingLocation, isSending, sendMessage, t]);

  const handleSelfLocation = useCallback(() => {
    if (isSending || isRequestingLocation) return;

    setLocationError("");
    requestAutoScroll();
    chat.addMessage(new ChatMessage("assistant", t("chat.selfLocationPrompt"), { kind: "normal" }));
    setLocationPromptHandled(true);
    bumpVersion();
  }, [bumpVersion, chat, isRequestingLocation, isSending, requestAutoScroll, t]);

  const handleOpenDirections = useCallback(
    (message: ChatMessage) => {
      if (isSending) return;

      const directions = message.meta.directions;
      if (!directions) return;

      const { lat, lng } = directions;
      if (typeof lat !== "number" || typeof lng !== "number") return;

      openGoogleMaps(lat, lng);
    },
    [isSending],
  );

  const handleClarificationSelect = useCallback(
    (option: string) => {
      if (isSending) return;
      setClarificationHandled(true);
      void sendMessage(option);
    },
    [isSending, sendMessage],
  );

  const handleResetFilters = useCallback(() => {
    updateFilters(defaultChatFilters);
  }, [updateFilters]);

  const handleSelectMode = useCallback(
    (mode: ChatMode) => {
      onChatModeChange(mode);
      setModeMenuOpen(false);
    },
    [onChatModeChange],
  );

  const handleStartNewChat = useCallback(() => {
    if (isSending) return;

    onStartNewChat();
    setFiltersOpen(false);
    setInputValue("");
    setLocationPromptHandled(false);
    setLocationError("");
    setClarificationHandled(false);
    requestAutoScroll();
  }, [isSending, onStartNewChat, requestAutoScroll]);

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
    [onCreateShortcut],
  );

  const handleApplyShortcut = useCallback(
    (shortcut: Shortcut) => {
      updateFilters(cloneFilters(shortcut.filters));
      setFiltersOpen(false);
      setInputValue(shortcut.prompt);
      setFocusSignal((current) => current + 1);
    },
    [updateFilters],
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
    [slashRawQuery],
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
        setCommandUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setCommandLocationStatus("ready");
      },
      () => {
        setCommandLocationStatus("error");
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }, []);

  useEffect(() => {
    if (!slashActive || slashQuery.length === 0) return;
    if (commandLocationStatus !== "idle") return;

    requestSlashLocation();
  }, [commandLocationStatus, requestSlashLocation, slashActive, slashQuery.length]);

  useEffect(() => {
    if (!slashActive || isResolvedSlashCommand) {
      commandRequestId.current += 1;
      setCommandCanteenResults([]);
      setCommandCanteenLoading(false);
      setCommandCanteenError(null);
      return undefined;
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
  }, [client, commandUserLocation?.lat, commandUserLocation?.lng, isResolvedSlashCommand, slashActive, slashQuery, t]);

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
  }, [shortcutQuery, shortcuts, slashActive]);

  const describeShortcut = useCallback(
    (shortcut: Shortcut) => {
      const prompt = shortcut.prompt.trim();
      if (prompt) {
        return prompt.length > 80 ? `${prompt.slice(0, 77)}...` : prompt;
      }

      const parts: string[] = [];
      if (shortcut.filters.priceCategory) {
        parts.push(
          t("chat.describe.priceCategory", {
            value:
              PRICE_CATEGORY_OPTIONS.find((option) => option.value === shortcut.filters.priceCategory)?.label ??
              shortcut.filters.priceCategory,
          }),
        );
      }
      if (shortcut.filters.diet) {
        parts.push(t("chat.describe.diet", { value: shortcut.filters.diet }));
      }
      if (shortcut.filters.allergens.length > 0) {
        parts.push(t("chat.describe.allergens", { count: shortcut.filters.allergens.length }));
      }
      if (shortcut.filters.canteens.length > 0) {
        parts.push(t("chat.describe.canteens", { count: shortcut.filters.canteens.length }));
      }

      return parts.length > 0 ? parts.join(" · ") : t("chat.describe.savedShortcut");
    },
    [t],
  );

  const shortcutItems: CommandMenuItem[] = useMemo(
    () =>
      filteredShortcuts.map((shortcut) => ({
        id: `shortcut-${shortcut.id}`,
        label: shortcut.name,
        meta: describeShortcut(shortcut),
        kind: "shortcut",
        payload: shortcut,
      })),
    [describeShortcut, filteredShortcuts],
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
    [commandCanteenResults],
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

    const shortcutEmptyLabel =
      shortcuts.length === 0
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
    canteenItems,
    commandCanteenError,
    commandCanteenLoading,
    dateItems,
    isResolvedSlashCommand,
    shortcutItems,
    shortcutQuery,
    shortcuts.length,
    slashActive,
    slashQuery.length,
    t,
  ]);

  const flatCommandItems = useMemo(() => commandGroups.flatMap((group) => group.items), [commandGroups]);

  useEffect(() => {
    if (!slashActive) return;

    if (flatCommandItems.length === 0) {
      setCommandActiveIndex(0);
      return;
    }

    if (commandActiveIndex >= flatCommandItems.length) {
      setCommandActiveIndex(0);
    }
  }, [commandActiveIndex, flatCommandItems.length, slashActive]);

  const activeCommandItem = flatCommandItems[commandActiveIndex];
  const activeCommandId = activeCommandItem?.id;

  const handleCommandNavigate = useCallback(
    (direction: "next" | "prev") => {
      if (flatCommandItems.length === 0) return;

      setCommandActiveIndex((current) => {
        const next = direction === "next" ? current + 1 : current - 1;
        if (next < 0) return flatCommandItems.length - 1;
        if (next >= flatCommandItems.length) return 0;
        return next;
      });
    },
    [flatCommandItems.length],
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
        setInputValue(buildSlashInput(commandBase, slashDateToken, { trailingSpace: !slashDateToken }));
        setFocusSignal((current) => current + 1);
        resolvedCanteenRef.current = { command: commandBase, canteen };
        return;
      }

      if (item.kind === "date") {
        const token = String(item.payload ?? "").trim();
        const base = slashRawQuery.trim();
        if (!base) return;

        const commandText = buildSlashInput(base, token);
        setInputValue("");
        setFocusSignal((current) => current + 1);
        void sendMessage(commandText);
      }
    },
    [handleApplyShortcut, sendMessage, slashDateToken, slashRawQuery],
  );

  const handleCommandClose = useCallback(() => {
    setInputValue("");
    setFocusSignal((current) => current + 1);
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

  const hasActiveFilters =
    filters.diet !== null ||
    filters.allergens.length > 0 ||
    filters.canteens.length > 0 ||
    filters.priceCategory !== null;

  const activeFilterItems: ActiveFilterItem[] = [
    ...(filters.priceCategory
      ? [
          {
            key: `price-${filters.priceCategory}`,
            label:
              PRICE_CATEGORY_OPTIONS.find((option) => option.value === filters.priceCategory)?.label ??
              t("chat.filters.priceCategory"),
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

  return {
    client,
    version,
    filtersOpen,
    setFiltersOpen,
    inputValue,
    setInputValue,
    focusSignal,
    modeMenuOpen,
    setModeMenuOpen,
    modeMenuRef,
    modeMenuPopoverId,
    shortcutModalOpen,
    setShortcutModalOpen,
    shortcutDraft,
    setShortcutDraft,
    isSending,
    activeStream,
    hasActiveFilters,
    activeFilterItems,
    commandMenu,
    locationPromptHandled,
    isRequestingLocation,
    locationError,
    clarificationHandled,
    updateFilters,
    sendMessage,
    handleStartNewChat,
    handleTranscribeAudio,
    handleShareLocation,
    handleSelfLocation,
    handleOpenDirections,
    handleClarificationSelect,
    handleResetFilters,
    handleSelectMode,
    handleOpenShortcutModal,
    handleSaveShortcut,
    handleApplyShortcut,
    bumpVersion,
  };
};
