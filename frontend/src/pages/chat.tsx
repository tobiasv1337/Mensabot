import React, { useState } from "react";

import Header from "../components/header/header";
import type { NavItem } from "../components/header/header";

import Sidebar from "../components/sidebar/sidebar";

import * as S from "./chat.styles";

const navItems: NavItem[] = ["Home", "ChatBot", "Mensen", "Über Uns", "Kontakt"];

const Chat: React.FC = () => {
  const [activeNav, setActiveNav] = useState<NavItem>("ChatBot");

  // Sidebar states
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(true);

  const isDesktop = window.innerWidth >= 768;

  return (
    <S.Page>
      <Header
        activeNav={activeNav}
        navItems={navItems}
        onNavClick={setActiveNav}
        onOpenSidebar={() =>
          isDesktop
            ? setDesktopCollapsed(false) // expand on desktop
            : setMobileSidebarOpen(true) // open mobile overlay
        }
      />

      <Sidebar
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        desktopCollapsed={desktopCollapsed}
        setDesktopCollapsed={setDesktopCollapsed}
        navItems={navItems}
        activeNav={activeNav}
        onNavClick={setActiveNav}
      />

      <S.Main shift={!desktopCollapsed && isDesktop}>
        <S.Container>
          <S.Title>ChatBot</S.Title>
          <S.Subtitle>
            Dies ist eine Testseite zum Ausprobieren von Header & Sidebar.
          </S.Subtitle>

          <S.Window>
            <S.Message>Hallo! Ich bin dein MensaBot 😊</S.Message>
            <S.Message self>Alles klar, funktioniert super!</S.Message>
          </S.Window>

          <S.InputRow
            onSubmit={(e) => {
              e.preventDefault();
            }}
          >
            <S.Input placeholder="Nachricht schreiben..." />
            <S.Send>Senden</S.Send>
          </S.InputRow>
        </S.Container>
      </S.Main>
    </S.Page>
  );
};

export default Chat;
