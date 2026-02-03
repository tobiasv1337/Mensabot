import React, { useState } from "react";
import Header from "../components/header/header";
import Sidebar from "../components/sidebar/sidebar";
import type { NavItem } from "../types/navigation";
import * as S from "./Chatpage.styles";
import Chat from "../components/chat/Chat.tsx";
import CanteensPage from "./CanteensPage";
import ShortcutsPage from "./ShortcutsPage";
import type { Canteen } from "../services/api";
import { useShortcuts } from "../services/shortcuts";

const NAV_ITEMS: NavItem[] = ["Home", "ChatBot", "Mensen", "Über Uns", "Kontakt"];

const ChatPage: React.FC = () => {
  const [activeNav, setActiveNav] = useState<NavItem>(NAV_ITEMS[0]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  // HIER: State für das Einklappen
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [selectedCanteen, setSelectedCanteen] = useState<Canteen | null>(null);
  const [chatResetKey, setChatResetKey] = useState(0);
  const { shortcuts, addShortcut, updateShortcut, deleteShortcut } = useShortcuts();

  const handleSelectCanteen = (canteen: Canteen) => {
    setSelectedCanteen(canteen);
    setChatResetKey((prev) => prev + 1);
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
                selectedCanteenId={selectedCanteen?.id ?? null}
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
                selectedCanteen={selectedCanteen}
                resetKey={chatResetKey}
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
