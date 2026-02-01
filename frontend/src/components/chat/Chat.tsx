import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Canteen, CanteenSearchResult, MenuResponse, PriceInfo } from "../../services/api";
import { MensaBotClient } from "../../services/api";
import { Chats, ChatMessage, type Chat as ChatType, type ChatFilters, defaultChatFilters } from "../../services/chats";
import type { Shortcut, ShortcutInput } from "../../services/shortcuts";
import ChatBubble, { type MessageAction } from "./ChatBubble";
import ChatInput, { type CommandMenuGroup, type CommandMenuItem } from "./ChatInput";
import FiltersEditor from "./FiltersEditor";
import ScrollablePillRow from "./ScrollablePillRow";
import ShortcutModal from "../shortcuts/ShortcutModal";
import AiWarningText from "./AiWarning/AiWarningText";
import mensabotLogo from "../../assets/mensabot-logo-gradient-round.svg";
import { DIET_OPTIONS, getAllergenLabel, normalizeAllergenList } from "./filterData";
import * as S from "./chat.styles";

const CHAT_ID = "default";
const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? "";

const WELCOME_TEXT =
  "Hallo! Ich bin dein Mensabot.\nFrag mich nach Speiseplänen, Öffnungszeiten oder Preisen.\nWelche Präferenzen hast du?";

const NEAR_BOTTOM_PX = 120;

const isNearBottom = (el: HTMLDivElement) => {
  const remaining = el.scrollHeight - el.scrollTop - el.clientHeight;
  return remaining <= NEAR_BOTTOM_PX;
};

type ChatProps = {
  selectedCanteen?: Canteen | null;
  resetKey?: number;
  shortcuts: Shortcut[];
  onCreateShortcut: (shortcut: ShortcutInput) => void;
};

const cloneFilters = (filters: ChatFilters): ChatFilters => ({
  diet: filters.diet ?? null,
  allergens: [...filters.allergens],
  canteens: [...filters.canteens],
});

const PRICE_FORMATTER = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
});

const formatPrice = (value?: number | null) => {
  if (value === null || value === undefined) return null;
  return PRICE_FORMATTER.format(value);
};

const formatPriceLine = (prices: PriceInfo) => {
  const parts: string[] = [];
  const pushPrice = (label: string, value?: number | null) => {
    const formatted = formatPrice(value);
    if (formatted) parts.push(`${label} ${formatted}`);
  };

  pushPrice("Studierende", prices.students);
  pushPrice("Mitarbeitende", prices.employees);
  pushPrice("Schüler:innen", prices.pupils);
  pushPrice("Gäste", prices.others);

  return parts.length > 0 ? parts.join(" · ") : null;
};

const DIET_LABELS: Record<string, string> = {
  vegan: "vegan",
  vegetarian: "vegetarisch",
  meat: "mit Fleisch",
  unknown: "unbekannt",
};

type MenuMeal = MenuResponse["meals"][number];

const groupMealsByCategory = (meals: MenuMeal[]) => {
  const groups = new Map<string, MenuMeal[]>();
  meals.forEach((meal) => {
    const key = meal.category?.trim() || "Weitere Gerichte";
    const existing = groups.get(key);
    if (existing) {
      existing.push(meal);
    } else {
      groups.set(key, [meal]);
    }
  });
  return Array.from(groups.entries());
};

const buildMenuMarkdown = (canteen: Canteen, menu: MenuResponse) => {
  const lines: string[] = [`### ${canteen.name}`];
  const metaParts = [canteen.city, canteen.address].filter(Boolean);
  if (metaParts.length > 0) {
    lines.push(`_${metaParts.join(" · ")}_`);
  }
  lines.push(`**Speiseplan für ${menu.date}**`);
  lines.push("");

  if (menu.status !== "ok") {
    const statusMessages: Record<MenuResponse["status"], string> = {
      ok: "",
      no_menu_published: "Für dieses Datum ist noch kein Speiseplan veröffentlicht.",
      empty_menu: "Für dieses Datum sind keine Gerichte eingetragen.",
      filtered_out: "Alle Gerichte wurden durch Filter ausgeschlossen.",
      invalid_date: "Das Datum ist ungültig.",
      api_error: "Der Speiseplan konnte gerade nicht geladen werden.",
    };
    const severity = menu.status === "api_error" || menu.status === "invalid_date" ? "⚠️" : "ℹ️";
    lines.push(`> ${severity} **Info:** ${statusMessages[menu.status]}`);
    return lines.join("\n");
  }

  if (menu.meals.length === 0) {
    lines.push("> ℹ️ **Info:** Für dieses Datum sind keine Gerichte eingetragen.");
    return lines.join("\n");
  }

  const grouped = groupMealsByCategory(menu.meals);
  grouped.forEach(([category, meals], groupIndex) => {
    if (groupIndex > 0) lines.push("");
    lines.push(`#### ${category}`);
    meals.forEach((meal) => {
      const dietLabel = DIET_LABELS[meal.diet_type] ?? meal.diet_type;
      const dietTag = meal.diet_type !== "unknown" ? ` _(${dietLabel})_` : "";
      lines.push(`- **${meal.name}**${dietTag}`);
      const priceLine = formatPriceLine(meal.prices);
      if (priceLine) {
        lines.push(`  - Preise: ${priceLine}`);
      }
      if (meal.allergens && meal.allergens.length > 0) {
        const allergenLabels = meal.allergens.map((item) => getAllergenLabel(item));
        lines.push(`  - Allergene: ${allergenLabels.join(", ")}`);
      }
    });
  });

  return lines.join("\n");
};

const Chat: React.FC<ChatProps> = ({
  selectedCanteen = null,
  resetKey = 0,
  shortcuts,
  onCreateShortcut,
}) => {
  const client = useMemo(() => new MensaBotClient(API_BASE_URL), []);
  const scrollRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);

  const [chat, setChat] = useState<ChatType>(() => {
    const existing = Chats.getById(CHAT_ID, true)!;
    if (existing.messages.length === 0) {
      existing.addMessage(new ChatMessage("assistant", WELCOME_TEXT));
    }
    return existing;
  });
  const chatRef = useRef(chat);

  const [version, setVersion] = useState(0);
  const [filters, setFilters] = useState<ChatFilters>(chat.filters ?? defaultChatFilters);
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

  const [commandActiveIndex, setCommandActiveIndex] = useState(0);
  const [commandCanteenResults, setCommandCanteenResults] = useState<CanteenSearchResult[]>([]);
  const [commandCanteenLoading, setCommandCanteenLoading] = useState(false);
  const [commandCanteenError, setCommandCanteenError] = useState<string | null>(null);
  const [commandUserLocation, setCommandUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [commandLocationStatus, setCommandLocationStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const lastHandledResetKey = useRef(0);

  const updateFilters = useCallback(
    (next: ChatFilters) => {
      chat.setFilters(next);
      setFilters(next);
    },
    [chat]
  );

  const updateFiltersPartial = useCallback(
    (partial: Partial<ChatFilters>) => {
      updateFilters({ ...filters, ...partial });
    },
    [filters, updateFilters]
  );

  const startNewChat = useCallback(
    (options?: { preselectedCanteen?: Canteen | null }) => {
      if (isSending) return null;
      Chats.deleteById(CHAT_ID);
      const fresh = Chats.getById(CHAT_ID, true)!;
      const nextFilters: ChatFilters = {
        ...defaultChatFilters,
        canteens: options?.preselectedCanteen ? [options.preselectedCanteen] : [],
      };
      fresh.setFilters(nextFilters);
      fresh.addMessage(new ChatMessage("assistant", WELCOME_TEXT));
      setChat(fresh);
      setFilters(nextFilters);
      setVersion((v) => v + 1);
      setFiltersOpen(false);
      setInputValue("");
      setLocationPromptHandled(false);
      setLocationError("");
      setShowScrollToLatest(false);
      shouldAutoScrollRef.current = true;
      return fresh;
    },
    [isSending]
  );

  const fetchAndAppendMenu = useCallback(
    async (canteen: Canteen, targetChat?: Chat) => {
      const requestId = ++menuRequestId.current;
      const activeChat = targetChat ?? chatRef.current;
      try {
        const menu = await client.getCanteenMenu(canteen.id);
        if (requestId !== menuRequestId.current) return;
        const message = buildMenuMarkdown(canteen, menu);
        shouldAutoScrollRef.current = true;
        activeChat.addMessage(new ChatMessage("assistant", message));
        setVersion((v) => v + 1);
      } catch (error) {
        if (requestId !== menuRequestId.current) return;
        shouldAutoScrollRef.current = true;
        activeChat.addMessage(
          new ChatMessage("assistant", "❌ Der Speiseplan konnte nicht geladen werden. Bitte versuche es erneut.")
        );
        setVersion((v) => v + 1);
      }
    },
    [client]
  );

  useEffect(() => {
    if (resetKey === 0) return;
    if (lastHandledResetKey.current === resetKey) return;
    lastHandledResetKey.current = resetKey;
    const fresh = startNewChat({ preselectedCanteen: selectedCanteen });
    if (fresh && selectedCanteen) {
      fetchAndAppendMenu(selectedCanteen, fresh);
    }
  }, [resetKey, selectedCanteen, startNewChat, fetchAndAppendMenu]);

  useEffect(() => {
    chatRef.current = chat;
    setFilters(chat.filters ?? defaultChatFilters);
  }, [chat]);

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
    shouldAutoScrollRef.current = isNearBottom(el);
    setShowScrollToLatest(!shouldAutoScrollRef.current);

    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    if (shouldAutoScrollRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [version, chat.messages.length, isSending]);

  useEffect(() => {
    const lastMsg = chat.messages[chat.messages.length - 1];
    if (!lastMsg) return;

    if (lastMsg.meta?.kind === "location_prompt") {
      setLocationPromptHandled(false);
      setLocationError("");
      return;
    }

    setLocationPromptHandled(true);
  }, [chat.messages.length]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (isSending) return;
      const trimmed = text.trim();
      if (!trimmed) return;

      setIsSending(true);
      try {
        shouldAutoScrollRef.current = true;
        await chat.send(client, trimmed, { includeToolCalls: true });
        setVersion((v) => v + 1);
      } catch (error) {
        console.error("Chat send failed:", error);
        chat.addMessage(
          new ChatMessage(
            "assistant",
            "❌ Server konnte nicht erreicht werden. Bitte versuche es später erneut."
          )
        );
        setVersion((v) => v + 1);
      } finally {
        setIsSending(false);
      }
    },
    [chat, client, isSending]
  );

  const handleShareLocation = useCallback(() => {
    if (isSending || isRequestingLocation) return;
    if (!("geolocation" in navigator)) {
      setLocationError("Dein Browser unterstützt keine Standortfreigabe.");
      return;
    }

    setLocationError("");
    setIsRequestingLocation(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const coordsMessage = `Mein Standort: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
        await sendMessage(coordsMessage);
        setLocationPromptHandled(true);
        setIsRequestingLocation(false);
      },
      (geoError) => {
        console.error("Geolocation error", geoError);
        setLocationError("Standort konnte nicht abgefragt werden. Bitte gib ihn manuell ein.");
        setIsRequestingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }, [isSending, isRequestingLocation, sendMessage]);

  const handleSelfLocation = useCallback(() => {
    if (isSending || isRequestingLocation) return;
    setLocationError("");
    chat.addMessage(
      new ChatMessage(
        "assistant",
        "Bitte gib deinen Standort unten ins Textfeld ein, damit ich passende Mensen in deiner Nähe finden kann.",
        { kind: "normal" }
      )
    );
    setLocationPromptHandled(true);
    setVersion((v) => v + 1);
  }, [chat, isSending, isRequestingLocation]);

  const handleResetFilters = useCallback(() => {
    updateFilters(defaultChatFilters);
  }, [updateFilters]);

  const hasActiveFilters =
    filters.diet !== null || filters.allergens.length > 0 || filters.canteens.length > 0;

  const activeFilterItems = [
    ...(filters.diet
      ? [
        {
          key: `diet-${filters.diet}`,
          label: DIET_OPTIONS.find((option) => option.value === filters.diet)?.label ?? "Ernährung",
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
    const normalized = raw.replace(/[_-]+/g, " ").trim();
    return { raw, normalized };
  }, [inputValue]);

  const slashActive = Boolean(slashState);
  const slashQuery = slashState?.normalized ?? "";
  const shortcutQuery = slashQuery.toLowerCase();

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
    if (!slashActive || slashQuery.length === 0) {
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
          minScore: 30,
          sortBy: "auto",
          nearLat: commandUserLocation?.lat,
          nearLng: commandUserLocation?.lng,
        });

        if (requestId !== commandRequestId.current) return;
        setCommandCanteenResults(response.results);
      } catch (error) {
        if (requestId !== commandRequestId.current) return;
        setCommandCanteenError("Mensen konnten nicht geladen werden.");
      } finally {
        if (requestId === commandRequestId.current) {
          setCommandCanteenLoading(false);
        }
      }
    }, 280);

    return () => window.clearTimeout(timer);
  }, [slashActive, slashQuery, client, commandUserLocation]);

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
    if (shortcut.filters.diet) parts.push(`Ernährung: ${shortcut.filters.diet}`);
    if (shortcut.filters.allergens.length > 0) parts.push(`Allergene: ${shortcut.filters.allergens.length}`);
    if (shortcut.filters.canteens.length > 0) parts.push(`Mensen: ${shortcut.filters.canteens.length}`);
    return parts.length > 0 ? parts.join(" · ") : "Gespeicherter Shortcut";
  }, []);

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
        if (result.distance_km !== undefined) {
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

  const commandGroups: CommandMenuGroup[] = useMemo(() => {
    if (!slashActive) return [];

    const shortcutEmptyLabel = shortcuts.length === 0
      ? "Noch keine Shortcuts gespeichert."
      : shortcutQuery
        ? "Keine passenden Shortcuts gefunden."
        : "Keine Shortcuts verfügbar.";

    let canteenEmptyLabel = "Tippe, um eine Mensa zu suchen.";
    if (slashQuery.length > 0) {
      if (commandCanteenLoading) {
        canteenEmptyLabel = "Suche läuft...";
      } else if (commandCanteenError) {
        canteenEmptyLabel = commandCanteenError;
      } else if (canteenItems.length === 0) {
        canteenEmptyLabel = "Keine Mensen gefunden.";
      }
    }

    return [
      {
        id: "shortcuts",
        label: "Shortcuts",
        items: shortcutItems,
        emptyLabel: shortcutItems.length === 0 ? shortcutEmptyLabel : undefined,
      },
      {
        id: "canteens",
        label: "Mensen",
        items: canteenItems,
        emptyLabel: canteenItems.length === 0 ? canteenEmptyLabel : undefined,
      },
    ];
  }, [
    slashActive,
    shortcutQuery,
    shortcuts.length,
    slashQuery.length,
    shortcutItems,
    canteenItems,
    commandCanteenLoading,
    commandCanteenError,
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
        updateFiltersPartial({ canteens: [canteen] });
        setFiltersOpen(false);
        setInputValue("");
        setFocusSignal((prev) => prev + 1);
        fetchAndAppendMenu(canteen);
      }
    },
    [handleApplyShortcut, updateFiltersPartial, fetchAndAppendMenu]
  );

  const handleCommandClose = useCallback(() => {
    setInputValue("");
    setFocusSignal((prev) => prev + 1);
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
      }
    : undefined;

  return (
    <S.ChatShell>
      <S.HeaderCard>
        <S.HeaderActions>
          {hasActiveFilters && (
            <S.IconButton
              type="button"
              $variant="ghost"
              onClick={handleResetFilters}
              title="Filter zurücksetzen"
              aria-label="Filter zurücksetzen"
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
              <S.IconButtonLabelAlways>Filter zurücksetzen</S.IconButtonLabelAlways>
            </S.IconButton>
          )}
          <S.IconButton
            type="button"
            $variant="ghost"
            onClick={() => setFiltersOpen((prev) => !prev)}
            title={filtersOpen ? "Filter schließen" : "Filter öffnen"}
            aria-label={filtersOpen ? "Filter schließen" : "Filter öffnen"}
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
            <S.IconButtonLabel>{filtersOpen ? "Filter schließen" : "Filter"}</S.IconButtonLabel>
          </S.IconButton>
          <S.IconButton
            type="button"
            $variant="primary"
            onClick={() => startNewChat()}
            disabled={isSending}
            title="Neuer Chat"
            aria-label="Neuer Chat"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 5v14M5 12h14"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
            <S.IconButtonLabelAlways>Neuer Chat</S.IconButtonLabelAlways>
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
            {chat.messages.map((message, index) => {
              const isLast = index === chat.messages.length - 1;
              const shouldShowLocationActions =
                message.meta.kind === "location_prompt" && isLast && !locationPromptHandled;
              const actions: MessageAction[] = shouldShowLocationActions
                ? [
                  {
                    id: "share-location",
                    label: isRequestingLocation ? "Frage Standort ab..." : "Aktuellen Standort teilen",
                    onClick: handleShareLocation,
                    disabled: isSending || isRequestingLocation,
                  },
                  {
                    id: "manual-location",
                    label: "Manuell eingeben",
                    onClick: handleSelfLocation,
                    variant: "secondary",
                    disabled: isSending || isRequestingLocation,
                  },
                ]
                : [];

              return (
                <ChatBubble
                  key={`${CHAT_ID}-${index}`}
                  message={message}
                  avatarSrc={mensabotLogo}
                  actions={actions}
                  actionsNote={shouldShowLocationActions && locationError ? locationError : undefined}
                />
              );
            })}

            {isSending && (
              <S.MessageRow>
                <S.Avatar src={mensabotLogo} alt="Mensabot" />
                <S.MessageContent>
                  <S.NameTag>Mensabot</S.NameTag>
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
          <S.ScrollToLatest type="button" onClick={handleScrollToLatest}>
            Zum neuesten ↓
          </S.ScrollToLatest>
        )}
      </S.MessagesCard>

      <S.ComposerCard>
        <ChatInput
          value={inputValue}
          onChange={setInputValue}
          onSend={sendMessage}
          disabled={isSending}
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
          initialData={shortcutDraft}
          client={client}
          onCancel={() => setShortcutModalOpen(false)}
          onSave={handleSaveShortcut}
        />
      )}
    </S.ChatShell>
  );
};

export default Chat;
