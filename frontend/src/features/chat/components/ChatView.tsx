import React, { useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import type { Canteen } from "@/shared/api/MensaBotClient";
import { ChatMessage, type Chat as ChatModel, type ChatFilters } from "../model/chats";
import type { ChatMode } from "../model/chatMode";
import type { Shortcut, ShortcutInput } from "@/features/shortcuts/model/shortcuts";
import ChatBubble, { type MessageAction } from "./ChatBubble";
import ChatStreamingBubble from "./ChatStreamingBubble";
import ChatInput from "./ChatInput";
import FiltersEditor from "./FiltersEditor";
import ScrollablePillRow from "./ScrollablePillRow";
import AiWarningText from "./AiWarning/AiWarningText";
import ShortcutModal from "@/features/shortcuts/components/ShortcutModal";
import mensabotLogo from "@/assets/mensabot-logo-gradient-round.svg";
import * as S from "./ChatView.styles";
import { useChatController } from "../hooks/useChatController";
import { useChatOnboarding } from "../hooks/useChatOnboarding";
import { useChatScrollState } from "../hooks/useChatScrollState";

type ChatViewProps = {
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

const ChatView: React.FC<ChatViewProps> = ({
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
  const shouldAutoScrollRef = useRef(true);
  const requestAutoScroll = useCallback(() => {
    shouldAutoScrollRef.current = true;
  }, []);

  const {
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
  } = useChatController({
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
  });

  const { composerRef, scrollRef, showScrollToLatest, handleScrollToLatest } = useChatScrollState({
    chatId: chat.id,
    messagesLength: chat.messages.length,
    version,
    isSending,
    activeStream,
    shouldAutoScrollRef,
    onComposerHeightChange,
  });

  const { isActive: isOnboardingActive, step: onboardingStep, startOnboarding, getActions } = useChatOnboarding(
    chat,
    updateFilters,
    () => {
      requestAutoScroll();
      bumpVersion();
    },
  );

  useEffect(() => {
    onOnboardingActiveChange?.(isOnboardingActive);
  }, [isOnboardingActive, onOnboardingActiveChange]);

  useEffect(
    () => () => {
      onOnboardingActiveChange?.(false);
    },
    [onOnboardingActiveChange],
  );

  const onboardingStartedRef = useRef(false);

  useEffect(() => {
    onboardingStartedRef.current = false;
  }, [chat.id]);

  useEffect(() => {
    if (isOnboardingActive || onboardingStep !== "idle" || menuCanteen || onboardingStartedRef.current) return;

    onboardingStartedRef.current = true;
    startOnboarding();
  }, [isOnboardingActive, menuCanteen, onboardingStep, startOnboarding]);

  const showWelcomeMessage = chat.messages.length === 0 && !menuCanteen && onboardingStep === "done";
  const activeModeLabel = chatMode === "fast" ? t("chat.mode.fast") : t("chat.mode.reliable");
  const activeModeDescription =
    chatMode === "fast" ? t("chat.mode.fastDescription") : t("chat.mode.reliableDescription");
  const modeOptions: { value: ChatMode; label: string; description: string }[] = [
    {
      value: "reliable",
      label: t("chat.mode.reliable"),
      description: t("chat.mode.reliableDescription"),
    },
    {
      value: "fast",
      label: t("chat.mode.fast"),
      description: t("chat.mode.fastDescription"),
    },
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
            onClick={() => setFiltersOpen((open) => !open)}
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
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
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
              <ChatBubble message={new ChatMessage("assistant", t("chat.welcome"))} avatarSrc={mensabotLogo} />
            )}

            {chat.messages.map((message, index) => {
              const isLast = index === chat.messages.length - 1;
              const isOnboardingMessage = message.meta.kind === "onboarding";
              const shouldShowLocationActions =
                message.meta.kind === "location_prompt" && isLast && !locationPromptHandled;
              const shouldShowDirectionsActions = message.meta.kind === "directions_prompt";
              const shouldShowClarificationActions =
                message.meta.kind === "clarification_prompt" && isLast && !clarificationHandled;

              const onboardingActions = isOnboardingMessage ? getActions(index, chat.messages.length) : [];

              const clarificationActions: MessageAction[] = shouldShowClarificationActions
                ? [
                    ...(message.meta.clarification?.options ?? []).map((option, optionIndex) => ({
                      id: `clarification-${optionIndex}`,
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

              const actions: MessageAction[] =
                onboardingActions.length > 0
                  ? onboardingActions
                  : shouldShowLocationActions
                    ? [
                        {
                          id: "share-location",
                          label: isRequestingLocation
                            ? t("chat.shareLocationLoading")
                            : t("chat.shareLocation"),
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

              const actionsNote = shouldShowLocationActions ? locationError || undefined : undefined;

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
          disabled={isOffline || isSending || isOnboardingActive}
          placeholder={
            isOffline
              ? t("chat.input.offlineDisabled")
              : isSending
                ? t("chat.input.sending")
                : isOnboardingActive
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

export default ChatView;
