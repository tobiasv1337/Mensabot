import React from "react";
import Chat from "../components/chat/Chat";
import { useAppShellContext } from "../layouts/useAppShellContext";

const ChatPage: React.FC = () => {
  const {
    chat,
    filters,
    chatMode,
    menuCanteen,
    shortcuts,
    isOffline,
    onChatModeChange,
    onFiltersChange,
    onStartNewChat,
    onCreateShortcut,
    onSuccessfulChat,
    onOnboardingActiveChange,
    onChatComposerHeightChange,
  } = useAppShellContext();

  return (
    <Chat
      chat={chat}
      filters={filters}
      chatMode={chatMode}
      onChatModeChange={onChatModeChange}
      onFiltersChange={onFiltersChange}
      onStartNewChat={onStartNewChat}
      menuCanteen={menuCanteen}
      shortcuts={shortcuts}
      onCreateShortcut={onCreateShortcut}
      isOffline={isOffline}
      onSuccessfulChat={onSuccessfulChat}
      onOnboardingActiveChange={onOnboardingActiveChange}
      onComposerHeightChange={onChatComposerHeightChange}
    />
  );
};

export default ChatPage;
