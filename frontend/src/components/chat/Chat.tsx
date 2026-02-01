import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Canteen, CanteenSearchResult } from "../../services/api";
import { MensaBotClient } from "../../services/api";
import { Chats, ChatMessage, type Chat, type ChatFilters, defaultChatFilters } from "../../services/chats";
import ChatBubble, { type MessageAction } from "./ChatBubble";
import ChatInput from "./ChatInput";
import ScrollablePillRow from "./ScrollablePillRow";
import AiWarningText from "./AiWarning/AiWarningText";
import mensabotLogo from "../../assets/mensabot-logo-gradient-round.svg";
import vegetarianIcon from "../../assets/vegetarian.svg";
import veganIcon from "../../assets/vegan.svg";
import meatIcon from "../../assets/meat.svg";
import * as S from "./chat.styles";

const CHAT_ID = "default";
const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? "";

const WELCOME_TEXT =
  "Hallo! Ich bin dein Mensabot.\nFrag mich nach Speiseplänen, Öffnungszeiten oder Preisen.\nWelche Präferenzen hast du?";

const NEAR_BOTTOM_PX = 120;

const DIET_OPTIONS: Array<{
  value: Exclude<ChatFilters["diet"], null>;
  label: string;
  iconSrc: string;
}> = [
  {
    value: "vegetarian",
    label: "Vegetarisch",
    iconSrc: vegetarianIcon,
  },
  {
    value: "vegan",
    label: "Vegan",
    iconSrc: veganIcon,
  },
  {
    value: "meat",
    label: "Fleisch",
    iconSrc: meatIcon,
  },
];

const ALLERGENS = [
  { key: "gluten", label: "Gluten" },
  { key: "wheat", label: "Weizen" },
  { key: "rye", label: "Roggen" },
  { key: "barley", label: "Gerste" },
  { key: "oats", label: "Hafer" },
  { key: "spelt", label: "Dinkel" },
  { key: "crustacean", label: "Krebstiere" },
  { key: "egg", label: "Eier" },
  { key: "fish", label: "Fisch" },
  { key: "peanut", label: "Erdnüsse" },
  { key: "soy", label: "Soja" },
  { key: "milk", label: "Milch" },
  { key: "lactose", label: "Laktose" },
  { key: "nut", label: "Schalenfrüchte" },
  { key: "celery", label: "Sellerie" },
  { key: "mustard", label: "Senf" },
  { key: "sesame", label: "Sesam" },
  { key: "sulfite", label: "Schwefeldioxid" },
  { key: "lupin", label: "Lupinen" },
  { key: "mollusc", label: "Weichtiere" },
  { key: "alcohol", label: "Alkohol" },
  { key: "caffeine", label: "Koffein" },
  { key: "quinine", label: "Chinin" },
  { key: "preservative", label: "Konservierungsstoffe" },
  { key: "nitrite", label: "Nitritpökelsalz" },
  { key: "antioxidant", label: "Antioxidationsmittel" },
  { key: "colorant", label: "Farbstoffe" },
  { key: "phosphate", label: "Phosphate" },
  { key: "sweetener", label: "Süßungsmittel" },
  { key: "flavor_enhancer", label: "Geschmacksverstärker" },
  { key: "gelatin", label: "Gelatine" },
  { key: "yeast", label: "Hefe" },
  { key: "phenylalanine", label: "Phenylalanin" },
  { key: "laxative", label: "Abführend" },
];

const ALLERGEN_LABELS = new Map(ALLERGENS.map((allergen) => [allergen.key, allergen.label]));
const ALLERGEN_KEY_BY_LABEL = new Map(ALLERGENS.map((allergen) => [allergen.label.toLowerCase(), allergen.key]));
const ALLERGEN_KEYS = new Set(ALLERGENS.map((allergen) => allergen.key));

const normalizeAllergenKey = (value: string) => {
  const trimmed = value.trim();
  if (ALLERGEN_KEYS.has(trimmed)) return trimmed;
  const byLabel = ALLERGEN_KEY_BY_LABEL.get(trimmed.toLowerCase());
  return byLabel ?? trimmed;
};

const normalizeAllergenList = (items: string[]) => {
  const seen = new Set<string>();
  const normalized: string[] = [];
  items.forEach((item) => {
    const key = normalizeAllergenKey(item);
    if (!seen.has(key)) {
      seen.add(key);
      normalized.push(key);
    }
  });
  return normalized;
};

const getAllergenLabel = (key: string) => ALLERGEN_LABELS.get(key) ?? key;

const isNearBottom = (el: HTMLDivElement) => {
  const remaining = el.scrollHeight - el.scrollTop - el.clientHeight;
  return remaining <= NEAR_BOTTOM_PX;
};

type ChatProps = {
  selectedCanteen?: Canteen | null;
  resetKey?: number;
};

const Chat: React.FC<ChatProps> = ({ selectedCanteen = null, resetKey = 0 }) => {
  const client = useMemo(() => new MensaBotClient(API_BASE_URL), []);
  const scrollRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);
  const canteenRequestId = useRef(0);
  const canteenAnchorRef = useRef<HTMLDivElement>(null);

  const [chat, setChat] = useState<Chat>(() => {
    const existing = Chats.getById(CHAT_ID, true)!;
    if (existing.messages.length === 0) {
      existing.addMessage(new ChatMessage("assistant", WELCOME_TEXT));
    }
    return existing;
  });

  const [version, setVersion] = useState(0);
  const [filters, setFilters] = useState<ChatFilters>(chat.filters ?? defaultChatFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showScrollToLatest, setShowScrollToLatest] = useState(false);

  const [locationPromptHandled, setLocationPromptHandled] = useState(false);
  const [isRequestingLocation, setIsRequestingLocation] = useState(false);
  const [locationError, setLocationError] = useState("");

  const [canteenFilterOpen, setCanteenFilterOpen] = useState(false);
  const [canteenQuery, setCanteenQuery] = useState("");
  const [canteenResults, setCanteenResults] = useState<CanteenSearchResult[]>([]);
  const [canteenLoading, setCanteenLoading] = useState(false);
  const [canteenError, setCanteenError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties | null>(null);

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
      if (isSending) return;
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
      setLocationPromptHandled(false);
      setLocationError("");
      setLocationStatus("idle");
      setUserLocation(null);
      setShowScrollToLatest(false);
      shouldAutoScrollRef.current = true;
    },
    [isSending]
  );

  useEffect(() => {
    if (resetKey === 0) return;
    startNewChat({ preselectedCanteen: selectedCanteen });
  }, [resetKey, selectedCanteen, startNewChat]);

  useEffect(() => {
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

  const requestSearchLocation = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setLocationStatus("error");
      return;
    }

    setLocationStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
        setLocationStatus("ready");
      },
      () => {
        setLocationStatus("error");
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }, []);

  useEffect(() => {
    if (!canteenFilterOpen) return;
    if (canteenQuery.trim().length === 0) return;
    if (locationStatus !== "idle") return;
    requestSearchLocation();
  }, [canteenFilterOpen, canteenQuery, locationStatus, requestSearchLocation]);

  const updateDropdownPosition = useCallback(() => {
    const anchor = canteenAnchorRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const width = Math.min(Math.max(rect.width, 240), 360);
    const padding = 12;
    let left = rect.left;
    if (left + width > window.innerWidth - padding) {
      left = Math.max(padding, window.innerWidth - width - padding);
    }
    const top = rect.bottom + 6;
    setDropdownStyle({ top, left, width });
  }, []);

  useLayoutEffect(() => {
    if (!canteenFilterOpen || canteenQuery.trim().length === 0) {
      setDropdownStyle(null);
      return;
    }

    updateDropdownPosition();

    const handleWindowChange = () => updateDropdownPosition();
    window.addEventListener("resize", handleWindowChange);
    window.addEventListener("scroll", handleWindowChange, true);

    return () => {
      window.removeEventListener("resize", handleWindowChange);
      window.removeEventListener("scroll", handleWindowChange, true);
    };
  }, [canteenFilterOpen, canteenQuery, updateDropdownPosition]);

  useEffect(() => {
    const trimmed = canteenQuery.trim();
    if (!canteenFilterOpen || trimmed.length === 0) {
      setCanteenResults([]);
      setCanteenLoading(false);
      setCanteenError(null);
      return;
    }

    const timer = window.setTimeout(async () => {
      const requestId = ++canteenRequestId.current;
      setCanteenLoading(true);
      setCanteenError(null);

      try {
        const response = await client.searchCanteens({
          query: trimmed,
          perPage: 8,
          sortBy: trimmed.length > 0 ? "auto" : userLocation ? "distance" : "name",
          nearLat: userLocation?.lat,
          nearLng: userLocation?.lng,
          hasCoordinates: userLocation ? true : undefined,
        });

        if (requestId !== canteenRequestId.current) return;
        setCanteenResults(response.results);
      } catch (error) {
        if (requestId !== canteenRequestId.current) return;
        setCanteenError("Mensen konnten nicht geladen werden.");
      } finally {
        if (requestId === canteenRequestId.current) {
          setCanteenLoading(false);
        }
      }
    }, 320);

    return () => window.clearTimeout(timer);
  }, [canteenQuery, canteenFilterOpen, client, userLocation]);

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

  const handleAddAllergen = useCallback(
    (allergen: string) => {
      if (filters.allergens.includes(allergen)) return;
      updateFiltersPartial({ allergens: [...filters.allergens, allergen] });
    },
    [filters.allergens, updateFiltersPartial]
  );

  const handleRemoveAllergen = useCallback(
    (allergen: string) => {
      updateFiltersPartial({ allergens: filters.allergens.filter((item) => item !== allergen) });
    },
    [filters.allergens, updateFiltersPartial]
  );

  const handleAddCanteen = useCallback(
    (canteen: Canteen) => {
      if (filters.canteens.some((item) => item.id === canteen.id)) return;
      updateFiltersPartial({ canteens: [...filters.canteens, canteen] });
      setCanteenQuery("");
      setCanteenResults([]);
    },
    [filters.canteens, updateFiltersPartial]
  );

  const handleRemoveCanteen = useCallback(
    (canteenId: number) => {
      updateFiltersPartial({ canteens: filters.canteens.filter((item) => item.id !== canteenId) });
    },
    [filters.canteens, updateFiltersPartial]
  );

  const handleResetFilters = useCallback(() => {
    updateFilters(defaultChatFilters);
    setCanteenQuery("");
    setCanteenResults([]);
    setCanteenError(null);
    setCanteenLoading(false);
    setCanteenFilterOpen(false);
    setLocationStatus("idle");
    setUserLocation(null);
  }, [updateFilters]);

  const availableAllergens = ALLERGENS.filter((allergen) => !filters.allergens.includes(allergen.key)).sort(
    (a, b) => a.label.localeCompare(b.label, "de")
  );

  const filteredCanteenResults = canteenResults.filter(
    (result) => !filters.canteens.some((item) => item.id === result.canteen.id)
  );

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
      onRemove: () => handleRemoveAllergen(allergenKey),
    })),
    ...filters.canteens.map((canteen) => ({
      key: `canteen-${canteen.id}`,
      label: canteen.name,
      onRemove: () => handleRemoveCanteen(canteen.id),
    })),
  ];

  const handleScrollToLatest = () => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    shouldAutoScrollRef.current = true;
    setShowScrollToLatest(false);
  };

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
          <S.FilterSection>
            <S.FilterLabel>Ernährungsweise</S.FilterLabel>
            <ScrollablePillRow>
              {DIET_OPTIONS.map((option) => (
                <S.PillButton
                  key={option.label}
                  type="button"
                  $selected={filters.diet === option.value}
                  $removable={filters.diet === option.value}
                  onClick={() =>
                    updateFiltersPartial({
                      diet: filters.diet === option.value ? null : option.value,
                    })
                  }
                >
                  {filters.diet === option.value && <S.PillRemove>×</S.PillRemove>}
                  <S.PillIcon>
                    <img src={option.iconSrc} alt="" aria-hidden="true" />
                  </S.PillIcon>
                  {option.label}
                </S.PillButton>
              ))}
            </ScrollablePillRow>
          </S.FilterSection>

          <S.FilterSection>
            <S.FilterLabel>Allergene</S.FilterLabel>
            <ScrollablePillRow>
              {[...filters.allergens, ...availableAllergens.map((allergen) => allergen.key)].map((allergenKey) => {
                const isSelected = filters.allergens.includes(allergenKey);
                return (
                  <S.PillButton
                    key={allergenKey}
                    type="button"
                    $selected={isSelected}
                    $removable={isSelected}
                    onClick={() =>
                      isSelected ? handleRemoveAllergen(allergenKey) : handleAddAllergen(allergenKey)
                    }
                  >
                    {isSelected && <S.PillRemove>×</S.PillRemove>}
                    {getAllergenLabel(allergenKey)}
                  </S.PillButton>
                );
              })}
            </ScrollablePillRow>
          </S.FilterSection>

          <S.FilterSection>
            <S.FilterLabel>Mensa</S.FilterLabel>
            <ScrollablePillRow onScroll={updateDropdownPosition}>
              <S.CanteenSearchWrap ref={canteenAnchorRef}>
                <S.PillInputShell
                  $active={canteenFilterOpen}
                  onClick={() => setCanteenFilterOpen(true)}
                >
                  <S.PillInput
                    type="search"
                    placeholder="Mensa suchen"
                    value={canteenQuery}
                    onChange={(event) => {
                      setCanteenQuery(event.target.value);
                      if (!canteenFilterOpen) setCanteenFilterOpen(true);
                    }}
                    onFocus={() => setCanteenFilterOpen(true)}
                    onBlur={() => {
                      if (canteenQuery.trim().length === 0) setCanteenFilterOpen(false);
                    }}
                    style={{
                      width: `${Math.min(Math.max(canteenQuery.length + 6, 12), 22)}ch`,
                    }}
                  />
                </S.PillInputShell>
                {canteenFilterOpen && canteenQuery.trim().length > 0 && dropdownStyle && (
                  <S.SearchDropdown style={dropdownStyle}>
                    {canteenLoading && <S.SearchDropdownItem $muted>Suche läuft...</S.SearchDropdownItem>}
                    {canteenError && <S.SearchDropdownItem $muted>Fehler beim Laden</S.SearchDropdownItem>}
                    {!canteenLoading && !canteenError && filteredCanteenResults.length === 0 && (
                      <S.SearchDropdownItem $muted>Keine Treffer</S.SearchDropdownItem>
                    )}
                    {!canteenLoading &&
                      !canteenError &&
                      filteredCanteenResults.map((result) => (
                        <S.SearchDropdownItem
                          key={result.canteen.id}
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => handleAddCanteen(result.canteen)}
                        >
                          <span>{result.canteen.name}</span>
                          <S.SearchDropdownMeta>
                            {result.canteen.city ? result.canteen.city : "Unbekannte Stadt"}
                            {result.distance_km !== undefined
                              ? ` · ${result.distance_km.toFixed(1)} km`
                              : ""}
                          </S.SearchDropdownMeta>
                        </S.SearchDropdownItem>
                      ))}
                  </S.SearchDropdown>
                )}
              </S.CanteenSearchWrap>
              {filters.canteens.map((canteen) => (
                <S.PillButton
                  key={canteen.id}
                  type="button"
                  $selected
                  $removable
                  onClick={() => handleRemoveCanteen(canteen.id)}
                >
                  <S.PillRemove>×</S.PillRemove>
                  {canteen.name}
                </S.PillButton>
              ))}
            </ScrollablePillRow>
          </S.FilterSection>
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
        <ChatInput onSend={sendMessage} disabled={isSending} />
        <AiWarningText />
      </S.ComposerCard>
    </S.ChatShell>
  );
};

export default Chat;
