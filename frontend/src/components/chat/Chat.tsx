import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Canteen, CanteenSearchResult } from "../../services/api";
import { getApiClient } from "../../services/apiClient";
import { ChatMessage, type Chat as ChatModel, type ChatFilters, defaultChatFilters } from "../../services/chats";
import type { Shortcut, ShortcutInput } from "../../services/shortcuts";
import ChatBubble, { type MessageAction } from "./ChatBubble";
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
import * as S from "./chat.styles";
import { openGoogleMaps } from "../../services/maps";

const NEAR_BOTTOM_PX = 120;
const DEBOUNCE_DELAY_MS = 280;

const isNearBottom = (el: HTMLDivElement) => {
  const remaining = el.scrollHeight - el.scrollTop - el.clientHeight;
  return remaining <= NEAR_BOTTOM_PX;
};

type ChatProps = {
  chat: ChatModel;
  filters: ChatFilters;
  onFiltersChange: (filters: ChatFilters) => void;
  onStartNewChat: (options?: { preselectedCanteen?: Canteen | null }) => void;
  menuCanteen?: Canteen | null;
  shortcuts: Shortcut[];
  onCreateShortcut: (shortcut: ShortcutInput) => void;
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
  onFiltersChange,
  onStartNewChat,
  menuCanteen = null,
  shortcuts,
  onCreateShortcut,
}) => {
  const { t } = useTranslation();
  const client = useMemo(() => getApiClient(), []);
  const scrollRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);


  const [version, setVersion] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showScrollToLatest, setShowScrollToLatest] = useState(false);

  const [inputValue, setInputValue] = useState("");
  const [focusSignal, setFocusSignal] = useState(0);
  const [shortcutModalOpen, setShortcutModalOpen] = useState(false);
  const [shortcutDraft, setShortcutDraft] = useState<ShortcutInput>({
    name: "",
    prompt: "",
    filters: defaultChatFilters,
  });

  const [locationPromptHandled, setLocationPromptHandled] = useState(false);
  const [isRequestingLocation, setIsRequestingLocation] = useState(false);
  const [locationError, setLocationError] = useState("");
  const menuRequestId = useRef(0);
  const commandRequestId = useRef(0);
  const initialMenuFetched = useRef(false);
  const resolvedCanteenRef = useRef<{ command: string; canteen: Canteen } | null>(null);

  const [commandActiveIndex, setCommandActiveIndex] = useState(0);
  const [commandCanteenResults, setCommandCanteenResults] = useState<CanteenSearchResult[]>([]);
  const [commandCanteenLoading, setCommandCanteenLoading] = useState(false);
  const [commandCanteenError, setCommandCanteenError] = useState<string | null>(null);
  const [commandUserLocation, setCommandUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [commandLocationStatus, setCommandLocationStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");

  const updateFilters = useCallback(
    (next: ChatFilters) => {
      onFiltersChange(next);
    },
    [onFiltersChange]
  );

  const onboarding = useOnboarding(chat, updateFilters, () => setVersion((v) => v + 1));

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
    setLocationPromptHandled(false);
    setLocationError("");
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
    const el = scrollRef.current;
    if (!el) return;

    if (shouldAutoScrollRef.current) {
      requestAnimationFrame(() => {
        scrollToBottom();
      });
    }
  }, [version, chat.messages.length, isSending, chat.id, scrollToBottom]);

  useEffect(() => {
    const lastMsg = chat.messages[chat.messages.length - 1];
    if (!lastMsg) return;

    if (lastMsg.meta?.kind === "location_prompt") {
      setLocationPromptHandled(false);
      setLocationError("");
      return;
    }

    setLocationPromptHandled(true);
  }, [version, chat]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (isSending) return;
      const trimmed = text.trim();
      if (!trimmed) return;

      if (trimmed.startsWith("/")) {
        const parsed = parseSlashCommand(trimmed.slice(1));
        if (!parsed.query) return;

        setIsSending(true);
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
          setIsSending(false);
        }
        return;
      }

      setIsSending(true);
      try {
        shouldAutoScrollRef.current = true;
        await chat.send(client, trimmed, { includeToolCalls: true });
        setVersion((v) => v + 1);
      } catch (err) {
        console.error("Chat send failed:", err);
        chat.addMessage(
          new ChatMessage(
            "assistant",
            t("chat.serverError")
          )
        );
        setVersion((v) => v + 1);
      } finally {
        setIsSending(false);
      }
    },
    [chat, client, isSending, commandUserLocation, updateFiltersPartial, fetchAndAppendMenu, t]
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
        const coordsMessage = t("chat.myLocation", { lat: latitude.toFixed(6), lng: longitude.toFixed(6) });
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

  const handleResetFilters = useCallback(() => {
    updateFilters(defaultChatFilters);
  }, [updateFilters]);

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

  return (
    <S.ChatShell>
      <S.HeaderCard>
        <S.HeaderActions>
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
              <S.IconButtonLabelAlways>{t("chat.resetFilters")}</S.IconButtonLabelAlways>
            </S.IconButton>
          )}
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
            <S.IconButtonLabelAlways>{t("chat.newChat")}</S.IconButtonLabelAlways>
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

              const onboardingActions = isOnboardingMsg
                ? onboarding.getActions(index, chat.messages.length)
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

            {isSending && (
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
            )}

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

      <S.ComposerCard>
        <ChatInput
          value={inputValue}
          onChange={setInputValue}
          onSend={sendMessage}
          onTranscribeAudio={handleTranscribeAudio}
          maxVoiceSeconds={180}
          disabled={isSending || onboarding.isActive}
          placeholder={isSending ? t("chat.input.sending") : onboarding.isActive ? t("chat.onboarding.inputDisabled") : undefined}
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
