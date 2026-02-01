import React, { useCallback, useEffect, useState } from "react";
import Header from "../components/header/header";
import Sidebar from "../components/sidebar/sidebar";
import type { NavItem } from "../types/navigation";
import * as S from "./Chatpage.styles";
import Chat from "../components/chat/Chat.tsx";
import CanteensPage from "./CanteensPage";
import ShortcutsPage from "./ShortcutsPage";
import type { Canteen } from "../services/api";
import { useShortcuts } from "../services/shortcuts";
import { Chats, type Chat as ChatSession, type ChatFilters, defaultChatFilters } from "../services/chats";

const NAV_ITEMS: NavItem[] = ["Home", "ChatBot", "Mensen", "Über Uns", "Kontakt"];
const DEFAULT_CHAT_ID = "default";

const ChatPage: React.FC = () => {
  const [activeNav, setActiveNav] = useState<NavItem>(NAV_ITEMS[0]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  // HIER: State für das Einklappen
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [chat, setChat] = useState<ChatSession>(() => Chats.getById(DEFAULT_CHAT_ID, true)!);
  const [filters, setFilters] = useState<ChatFilters>(() => chat.filters ?? defaultChatFilters);
  const [menuRequestToken, setMenuRequestToken] = useState(0);
  const [menuCanteen, setMenuCanteen] = useState<Canteen | null>(null);
  const { shortcuts, addShortcut, updateShortcut, deleteShortcut } = useShortcuts();

  useEffect(() => {
    setFilters(chat.filters ?? defaultChatFilters);
  }, [chat]);

  const updateChatFilters = useCallback(
    (next: ChatFilters) => {
      chat.setFilters(next);
      setFilters(next);
    },
    [chat]
  );

  const startNewChat = useCallback(
    (options?: { preselectedCanteen?: Canteen | null }) => {
      Chats.deleteById(DEFAULT_CHAT_ID);
      const fresh = Chats.getById(DEFAULT_CHAT_ID, true)!;
      const nextFilters: ChatFilters = {
        ...defaultChatFilters,
        canteens: options?.preselectedCanteen ? [options.preselectedCanteen] : [],
      };
      fresh.setFilters(nextFilters);
      setChat(fresh);
      setFilters(nextFilters);
    },
    []
  );

  const handleSelectCanteen = (canteen: Canteen) => {
    startNewChat({ preselectedCanteen: canteen });
    setMenuCanteen(canteen);
    setMenuRequestToken((prev) => prev + 1);
    setActiveNav("ChatBot");
    setDrawerOpen(false);
  };

  return (
    <S.PageRoot>
      <Header
        activeNav={activeNav}
        navItems={NAV_ITEMS}
        onNavClick={setActiveNav}
        onToggleSidebar={() => setDrawerOpen(!drawerOpen)}
      />

      <S.Shell>
        {/* WICHTIG: $collapsed Prop an das Grid geben */}
        <S.BodyGrid $collapsed={isCollapsed}>
          <S.SidebarSlot>
            <Sidebar
              mode="desktop"
              drawerOpen={true}
              isCollapsed={isCollapsed} // Prop weitergeben
              onToggleCollapse={() => setIsCollapsed(!isCollapsed)} // Toggle-Funktion
              onCloseDrawer={() => { }}
              navItems={NAV_ITEMS}
              activeNav={activeNav}
              onNavClick={setActiveNav}
            />
          </S.SidebarSlot>

          <S.Content>
            {activeNav === "Mensen" ? (
              <CanteensPage
                onSelectCanteen={handleSelectCanteen}
                selectedCanteenIds={filters.canteens.map((canteen) => canteen.id)}
              />
            ) : activeNav === "Shortcuts" ? (
              <ShortcutsPage
                shortcuts={shortcuts}
                onCreateShortcut={addShortcut}
                onUpdateShortcut={updateShortcut}
                onDeleteShortcut={deleteShortcut}
              />
            ) : (
              <Chat
                chat={chat}
                filters={filters}
                onFiltersChange={updateChatFilters}
                onStartNewChat={startNewChat}
                menuCanteen={menuCanteen}
                menuRequestToken={menuRequestToken}
                shortcuts={shortcuts}
                onCreateShortcut={addShortcut}
              />
            )}
          </S.Content>
        </S.BodyGrid>

        <Sidebar
          mode="drawer"
          drawerOpen={drawerOpen}
          onCloseDrawer={() => setDrawerOpen(false)}
          navItems={NAV_ITEMS}
          activeNav={activeNav}
          onNavClick={setActiveNav}
        />
      </S.Shell>
    </S.PageRoot>
  );
};


export default ChatPage;
