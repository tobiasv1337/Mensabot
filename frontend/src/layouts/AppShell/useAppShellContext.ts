import { useOutletContext } from "react-router-dom";
import type { Canteen } from "@/shared/api/MensaBotClient";
import type { ChatMode } from "@/features/chat/model/chatMode";
import type { Chat } from "@/features/chat/model/chatStore";
import type { ChatFilters } from "@/features/chat/model/chatTypes";
import type { Shortcut, ShortcutInput } from "@/features/shortcuts/model/shortcuts";

export type AppShellInstallEntry = {
  label: string;
  description: string;
  actionLabel: string;
  onClick: () => void;
} | null;

export type AppShellContextValue = {
  isOffline: boolean;
  selectedCanteenIds: number[];
  chat: Chat;
  filters: ChatFilters;
  chatMode: ChatMode;
  menuCanteen: Canteen | null;
  shortcuts: Shortcut[];
  installEntry: AppShellInstallEntry;
  onSelectCanteen: (canteen: Canteen) => void;
  onStartNewChat: (options?: { preselectedCanteen?: Canteen | null }) => void;
  onCreateShortcut: (shortcut: ShortcutInput) => void;
  onUpdateShortcut: (id: string, shortcut: ShortcutInput) => void;
  onDeleteShortcut: (id: string) => void;
  onChatModeChange: (mode: ChatMode) => void;
  onFiltersChange: (filters: ChatFilters) => void;
  onSuccessfulChat: () => void;
  onOnboardingActiveChange: (active: boolean) => void;
  onChatComposerHeightChange: (height: number) => void;
  onDeleteAllChats: () => void;
  onResetOnboarding: () => void;
};

export const useAppShellContext = () => useOutletContext<AppShellContextValue>();
