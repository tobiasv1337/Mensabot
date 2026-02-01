import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Canteen } from "../../services/api";
import { MensaBotClient } from "../../services/api";
import { Chats, ChatMessage, type Chat as ChatType, type ChatFilters, defaultChatFilters } from "../../services/chats";
import type { Shortcut, ShortcutInput } from "../../services/shortcuts";
import ChatBubble, { type MessageAction } from "./ChatBubble";
import ChatInput from "./ChatInput";
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
      setInputValue("");
      setLocationPromptHandled(false);
      setLocationError("");
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
