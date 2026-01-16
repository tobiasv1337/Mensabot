import React, { useState } from "react";
import Header from "../components/header/header";
import Sidebar from "../components/sidebar/sidebar";
import type { NavItem } from "../components/header/header";
import * as S from "./Chatpage.styles";
import Chat from "../components/chat/Chat.tsx";

const NAV_ITEMS: NavItem[] = ["Home","ChatBot", "Mensen", "Über Uns", "Kontakt"];

const ChatPage: React.FC = () => {
  const [activeNav, setActiveNav] = useState<NavItem>(NAV_ITEMS[0]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  // HIER: State für das Einklappen
  const [isCollapsed, setIsCollapsed] = useState(false);

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
              onCloseDrawer={() => {}}
              navItems={NAV_ITEMS}
              activeNav={activeNav}
              onNavClick={setActiveNav}
            />
          </S.SidebarSlot>

          <S.Content>
            <Chat />
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
