import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Canteen, CanteenSearchResult, MenuResponse, PriceInfo } from "../../services/api";
import { MensaBotClient } from "../../services/api";
import { ChatMessage, type Chat as ChatType, type ChatFilters, defaultChatFilters } from "../../services/chats";
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

const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? "";

const WELCOME_TEXT =
  "Hallo! Ich bin dein Mensabot.\nFrag mich nach Speiseplänen, Öffnungszeiten oder Preisen.\nWelche Präferenzen hast du?";

const NEAR_BOTTOM_PX = 120;
const DEBOUNCE_DELAY_MS = 280;

const isNearBottom = (el: HTMLDivElement) => {
  const remaining = el.scrollHeight - el.scrollTop - el.clientHeight;
  return remaining <= NEAR_BOTTOM_PX;
};

type ChatProps = {
  chat: ChatType;
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

const WEEKDAY_INDEX: Record<string, number> = {
  monday: 1,
  montag: 1,
  tuesday: 2,
  dienstag: 2,
  wednesday: 3,
  mittwoch: 3,
  thursday: 4,
  donnerstag: 4,
  friday: 5,
  freitag: 5,
  saturday: 6,
  samstag: 6,
  sunday: 0,
  sonntag: 0,
};

const WEEKDAY_LABELS = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];

const normalizeDateToken = (token: string) =>
  token
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z]/g, "");

const toLocalISODate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const toLocalDateToken = (date: Date) => {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
};

const parseSlashCommand = (
  rawInput: string
): { query: string; rawQuery: string; dateISO?: string; dateToken?: string } => {
  let working = rawInput.trim();
  let dateISO: string | undefined;
  let dateToken: string | undefined;

  const today = new Date();
  const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const dateMatch = working.match(/(\d{1,2})\.(\d{1,2})(?:\.(\d{2,4}))?/);
  if (dateMatch) {
    const day = Number.parseInt(dateMatch[1], 10);
    const month = Number.parseInt(dateMatch[2], 10);
    let year = dateMatch[3] ? Number.parseInt(dateMatch[3], 10) : todayDate.getFullYear();
    if (dateMatch[3] && dateMatch[3].length === 2) {
      year += 2000;
    }

    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      let candidate = new Date(year, month - 1, day);
      if (!dateMatch[3] && candidate < todayDate) {
        candidate = new Date(year + 1, month - 1, day);
      }
      if (
        candidate.getFullYear() === (dateMatch[3] ? year : candidate.getFullYear()) &&
        candidate.getMonth() === month - 1 &&
        candidate.getDate() === day
      ) {
        dateISO = toLocalISODate(candidate);
        dateToken = dateMatch[0];
      }
    }

    working = working.replace(dateMatch[0], " ");
    working = working.replace(/\s+/g, " ");
  }

  const tokens = working.split(/\s+/).filter(Boolean);
  const remainingTokens: string[] = [];

  for (const token of tokens) {
    const cleaned = normalizeDateToken(token);
    if (cleaned === "today" || cleaned === "heute") {
      if (!dateISO) {
        dateISO = toLocalISODate(todayDate);
        dateToken = token;
      }
      continue;
    }
    if (cleaned === "tomorrow" || cleaned === "morgen") {
      if (!dateISO) {
        const tomorrow = new Date(todayDate);
        tomorrow.setDate(todayDate.getDate() + 1);
        dateISO = toLocalISODate(tomorrow);
        dateToken = token;
      }
      continue;
    }
    if (cleaned === "uebermorgen" || cleaned === "dayaftertomorrow") {
      if (!dateISO) {
        const dayAfterTomorrow = new Date(todayDate);
        dayAfterTomorrow.setDate(todayDate.getDate() + 2);
        dateISO = toLocalISODate(dayAfterTomorrow);
        dateToken = token;
      }
      continue;
    }
    if (WEEKDAY_INDEX[cleaned] !== undefined) {
      if (!dateISO) {
        const target = WEEKDAY_INDEX[cleaned];
        const delta = (target - todayDate.getDay() + 7) % 7 || 7;
        const targetDate = new Date(todayDate);
        targetDate.setDate(todayDate.getDate() + delta);
        dateISO = toLocalISODate(targetDate);
        dateToken = token;
      }
      continue;
    }
    remainingTokens.push(token);
  }

  const rawQuery = remainingTokens.join(" ").trim();

  return {
    query: rawQuery.replace(/[_-]+/g, " ").trim(),
    rawQuery,
    dateISO,
    dateToken,
  };
};

const formatCanteenCommand = (canteen: Canteen) =>
  canteen.name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^\p{L}\p{N}_-]/gu, "");

const buildSlashInput = (base: string, dateToken?: string, options?: { trailingSpace?: boolean }) => {
  const trimmed = base.trim();
  const core = trimmed ? `/${trimmed}` : "/";
  if (dateToken) return `${core} ${dateToken}`;
  return options?.trailingSpace ? `${core} ` : core;
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
  const lines: string[] = [`### ${canteen.name ?? "Mensa"}`];
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
  chat,
  filters,
  onFiltersChange,
  onStartNewChat,
  menuCanteen = null,
  shortcuts,
  onCreateShortcut,
}) => {
  const client = useMemo(() => new MensaBotClient(API_BASE_URL), []);
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
    async (canteen: Canteen, targetChat: ChatType, dateOverride?: string) => {
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
      } catch (error) {
        if (requestId !== menuRequestId.current) return;
        shouldAutoScrollRef.current = true;
        targetChat.addMessage(
          new ChatMessage("assistant", "❌ Der Speiseplan konnte nicht geladen werden. Bitte versuche es erneut.")
        );
        setVersion((v) => v + 1);
      }
    },
    [client]
  );

  useEffect(() => {
    if (chat.messages.length > 0) return;
    if (menuCanteen) {
      if (!initialMenuFetched.current) {
        initialMenuFetched.current = true;
        fetchAndAppendMenu(menuCanteen, chat);
      }
      return;
    }
    chat.addMessage(new ChatMessage("assistant", WELCOME_TEXT));
    setVersion((v) => v + 1);
  }, [chat, menuCanteen, fetchAndAppendMenu]);

  useEffect(() => {
    setFiltersOpen(false);
    setInputValue("");
    setLocationPromptHandled(false);
    setLocationError("");
    setShowScrollToLatest(false);
    shouldAutoScrollRef.current = true;
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

      if (trimmed.startsWith("/")) {
        const parsed = parseSlashCommand(trimmed.slice(1));
        if (!parsed.query) return;

        setIsSending(true);
        try {
          const response = await client.searchCanteens({
            query: parsed.query,
            perPage: 1,
            minScore: 30,
            sortBy: "auto",
            nearLat: commandUserLocation?.lat,
            nearLng: commandUserLocation?.lng,
          });

          const selected = response.results[0]?.canteen;
          if (!selected) {
            chat.addMessage(
              new ChatMessage("assistant", "❌ Keine passende Mensa gefunden. Bitte prüfe den Namen.")
            );
            setVersion((v) => v + 1);
            return;
          }

          updateFiltersPartial({ canteens: [selected] });
          await fetchAndAppendMenu(selected, chat, parsed.dateISO);
        } catch (error) {
          chat.addMessage(
            new ChatMessage("assistant", "❌ Mensa konnte nicht geladen werden. Bitte versuche es erneut.")
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
    [chat, client, isSending, commandUserLocation, updateFiltersPartial, fetchAndAppendMenu]
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
    if (!slashActive || slashQuery.length === 0 || isResolvedSlashCommand) {
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
    }, DEBOUNCE_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [slashActive, slashQuery, isResolvedSlashCommand, client, commandUserLocation]);

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
        label = "Heute";
        token = "heute";
      } else if (index === 1) {
        label = "Morgen";
        token = "morgen";
      } else if (index === 2) {
        label = "Übermorgen";
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
  }, []);

  const commandGroups: CommandMenuGroup[] = useMemo(() => {
    if (!slashActive) return [];

    if (isResolvedSlashCommand) {
      return [
        {
          id: "dates",
          label: "Datum",
          items: dateItems,
        },
      ];
    }

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
    isResolvedSlashCommand,
    shortcutQuery,
    shortcuts.length,
    slashQuery.length,
    shortcutItems,
    canteenItems,
    dateItems,
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
        const commandBase = formatCanteenCommand(canteen);
        setInputValue(
          buildSlashInput(commandBase, slashDateToken, { trailingSpace: !slashDateToken })
        );
        setFocusSignal((prev) => prev + 1);
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
            onClick={handleStartNewChat}
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
                  key={`${chat.id}-${index}`}
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
