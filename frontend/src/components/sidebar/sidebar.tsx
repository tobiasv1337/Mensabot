import React from "react";
import * as S from "./sidebar.styles";
import type { NavItem } from "../../types/navigation";
import { useTheme } from "../../theme/themeProvider";
import { Button } from "../button/button";
import { ButtonIconWrapper, ButtonTextWrapper } from "../button/button.styles";

const SideBarIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 -960 960 960"
    fill="currentColor"
    aria-hidden
  >
    <path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Zm120-80v-560H200v560h120Zm80 0h360v-560H400v560Zm-80 0H200h120Z" />
  </svg>
);

const HomeIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 -960 960 960"
    fill="currentColor"
    aria-hidden
  >
    <path d="M240-200h120v-240h240v240h120v-360L480-740 240-560v360Zm-80 80v-480l320-240 320 240v480H520v-240h-80v240H160Zm320-350Z" />
  </svg>
);

const NewChatIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 -960 960 960"
    fill="currentColor"
    aria-hidden
  >
    <path d="M120-160v-600q0-33 23.5-56.5T200-840h480q33 0 56.5 23.5T760-760v203q-10-2-20-2.5t-20-.5q-10 0-20 .5t-20 2.5v-203H200v400h283q-2 10-2.5 20t-.5 20q0 10 .5 20t2.5 20H240L120-160Zm160-440h320v-80H280v80Zm0 160h200v-80H280v80Zm400 280v-120H560v-80h120v-120h80v120h120v80H760v120h-80ZM200-360v-400 400Z" />
  </svg>
);

const ChatIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 -960 960 960"
    fill="currentColor"
    aria-hidden
  >
    <path d="M240-400h320v-80H240v80Zm0-120h480v-80H240v80Zm0-120h480v-80H240v80ZM80-80v-720q0-33 23.5-56.5T160-880h640q33 0 56.5 23.5T880-800v480q0 33-23.5 56.5T800-240H240L80-80Zm126-240h594v-480H160v525l46-45Zm-46 0v-480 480Z" />
  </svg>
);

const MensenIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 -960 960 960"
    fill="currentColor"
    aria-hidden
  >
    <path d="m175-120-56-56 410-410q-18-42-5-95t57-95q53-53 118-62t106 32q41 41 32 106t-62 118q-42 44-95 57t-95-5l-50 50 304 304-56 56-304-302-304 302Zm118-342L173-582q-54-54-54-129t54-129l248 250-128 128Z" />
  </svg>
);

const AboutUsIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 -960 960 960"
    fill="currentColor"
    aria-hidden
  >
    <path d="M0-240v-63q0-43 44-70t116-27q13 0 25 .5t23 2.5q-14 21-21 44t-7 48v65H0Zm240 0v-65q0-32 17.5-58.5T307-410q32-20 76.5-30t96.5-10q53 0 97.5 10t76.5 30q32 20 49 46.5t17 58.5v65H240Zm540 0v-65q0-26-6.5-49T754-397q11-2 22.5-2.5t23.5-.5q72 0 116 26.5t44 70.5v63H780Zm-455-80h311q-10-20-55.5-35T480-370q-55 0-100.5 15T325-320ZM160-440q-33 0-56.5-23.5T80-520q0-34 23.5-57t56.5-23q34 0 57 23t23 57q0 33-23 56.5T160-440Zm640 0q-33 0-56.5-23.5T720-520q0-34 23.5-57t56.5-23q34 0 57 23t23 57q0 33-23 56.5T800-440Zm-320-40q-50 0-85-35t-35-85q0-51 35-85.5t85-34.5q51 0 85.5 34.5T600-600q0 50-34.5 85T480-480Zm0-80q17 0 28.5-11.5T520-600q0-17-11.5-28.5T480-640q-17 0-28.5 11.5T440-600q0 17 11.5 28.5T480-560Zm1 240Zm-1-280Z" />
  </svg>
);

const ContactIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 -960 960 960"
    fill="currentColor"
    aria-hidden
  >
    <path d="M480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480v58q0 59-40.5 100.5T740-280q-35 0-66-15t-52-43q-29 29-65.5 43.5T480-280q-83 0-141.5-58.5T280-480q0-83 58.5-141.5T480-680q83 0 141.5 58.5T680-480v58q0 26 17 44t43 18q26 0 43-18t17-44v-58q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93h200v80H480Zm0-280q50 0 85-35t35-85q0-50-35-85t-85-35q-50 0-85 35t-35 85q0 50 35 85t85 35Z" />
  </svg>
);

const SettingsIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 -960 960 960"
    fill="currentColor"
    aria-hidden
  >
    <path d="m370-80-16-128q-13-5-24.5-12T307-235l-119 50L78-375l103-78q-1-7-1-13.5v-27q0-6.5 1-13.5L78-585l110-190 119 50q11-8 23-15t24-12l16-128h220l16 128q13 5 24.5 12t22.5 15l119-50 110 190-103 78q1 7 1 13.5v27q0 6.5-2 13.5l103 78-110 190-118-50q-11 8-23 15t-24 12L590-80H370Zm70-80h79l14-106q31-8 57.5-23.5T639-327l99 41 39-68-86-65q5-14 7-29.5t2-31.5q0-16-2-31.5t-7-29.5l86-65-39-68-99 42q-22-23-48.5-38.5T533-694l-13-106h-79l-14 106q-31 8-57.5 23.5T321-633l-99-41-39 68 86 64q-5 15-7 30t-2 32q0 16 2 31t7 30l-86 65 39 68 99-42q22 23 48.5 38.5T427-266l13 106Zm42-180q58 0 99-41t41-99q0-58-41-99t-99-41q-59 0-99.5 41T342-480q0 58 40.5 99t99.5 41Zm-2-140Z" />
  </svg>
);

const ShortcutsIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 -960 960 960"
    fill="currentColor"
    aria-hidden
  >
    <path d="m226-559 78 33q14-28 29-54t33-52l-56-11-84 84Zm142 83 114 113q42-16 90-49t90-75q70-70 109.5-155.5T806-800q-72-5-158 34.5T492-656q-42 42-75 90t-49 90Zm178-65q-23-23-23-56.5t23-56.5q23-23 57-23t57 23q23 23 23 56.5T660-541q-23 23-57 23t-57-23Zm19 321 84-84-11-56q-26 18-52 32.5T532-299l33 79Zm313-653q19 121-23.5 235.5T708-419l20 99q4 20-2 39t-20 33L538-80l-84-197-171-171-197-84 167-168q14-14 33.5-20t39.5-2l99 20q104-104 218-147t235-24ZM157-321q35-35 85.5-35.5T328-322q35 35 34.5 85.5T327-151q-25 25-83.5 43T82-76q14-103 32-161.5t43-83.5Zm57 56q-10 10-20 36.5T180-175q27-4 53.5-13.5T270-208q12-12 13-29t-11-29q-12-12-29-11.5T214-265Z" />
  </svg>
);

const MapIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 -960 960 960"
    fill="currentColor"
    aria-hidden
  >
    <path d="m600-120-240-84-186 72q-20 8-37-4.5T120-170v-560q0-13 7.5-23t20.5-15l212-72 240 84 186-72q20-8 37 4.5t17 33.5v560q0 13-7.5 23T812-192l-212 72Zm-40-98v-468l-160-56v468l160 56Zm80 0 120-40v-474l-120 46v468Zm-440-10 120-46v-468l-120 40v474Zm440-458v468-468Zm-320-56v468-468Z" />
  </svg>
);

const LightModeIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 -960 960 960"
    fill="currentColor"
    aria-hidden
  >
    <path d="M440-800v-120h80v120h-80Zm0 760v-120h80v120h-80Zm360-400v-80h120v80H800Zm-760 0v-80h120v80H40Zm708-252-56-56 70-72 58 58-72 70ZM198-140l-58-58 72-70 56 56-70 72Zm564 0-70-72 56-56 72 70-58 58ZM212-692l-72-70 58-58 70 72-56 56Zm268 452q-100 0-170-70t-70-170q0-100 70-170t170-70q100 0 170 70t70 170q0 100-70 170t-170 70Zm0-80q67 0 113.5-46.5T640-480q0-67-46.5-113.5T480-640q-67 0-113.5 46.5T320-480q0 67 46.5 113.5T480-320Zm0-160Z" />
  </svg>
);

const DarkModeIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 -960 960 960"
    fill="currentColor"
    aria-hidden
  >
    <path d="M484-80q-84 0-157.5-32t-128-86.5Q144-253 112-326.5T80-484q0-146 93-257.5T410-880q-18 99 11 193.5T521-521q71 71 165.5 100T880-410q-26 144-138 237T484-80Zm0-80q88 0 163-44t118-121q-86-8-163-43.5T464-465q-61-61-97-138t-43-163q-77 43-120.5 118.5T160-484q0 135 94.5 229.5T484-160Zm-20-305Z" />
  </svg>
);

const SystemModeIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 -960 960 960"
    fill="currentColor"
    aria-hidden
  >
    <path d="M40-120v-80h880v80H40Zm120-120q-33 0-56.5-23.5T80-320v-440q0-33 23.5-56.5T160-840h640q33 0 56.5 23.5T880-760v440q0 33-23.5 56.5T800-240H160Zm0-80h640v-440H160v440Zm0 0v-440 440Z" />
  </svg>
);

interface SidebarProps {
  mode: "desktop" | "drawer";
  drawerOpen: boolean;
  onCloseDrawer: () => void;

  navItems: NavItem[];
  activeNav: NavItem;
  onNavClick: (i: NavItem) => void;

  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

/* Icons */
const getIcon = (item: string) => {
  switch (item) {
    case "Home":
      return <HomeIcon />;
    case "ChatBot":
      return <ChatIcon />;
    case "Mensen":
      return <MensenIcon />;
    case "Über Uns":
      return <AboutUsIcon />;
    case "Kontakt":
      return <ContactIcon />;
    default:
      return "•";
  }
};

const Sidebar: React.FC<SidebarProps> = ({
  mode,
  drawerOpen,
  onCloseDrawer,
  navItems,
  activeNav,
  onNavClick,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const { mode: themeMode, toggleMode } = useTheme();

  const handleNavSelection = (target: NavItem) => {
    onNavClick(target);

    if (mode === "drawer") {
      onCloseDrawer();
    }
  };

  return (
    <>
      <S.Backdrop $isOpen={drawerOpen} $mode={mode} onClick={onCloseDrawer} />

      <S.Sidebar
        $isOpen={drawerOpen}
        $mode={mode}
        $isCollapsed={isCollapsed}
      >
        {/* Desktop Collapse Toggle */}
        {mode === "desktop" && (
          <div style={{ display: 'flex', justifyContent: isCollapsed ? 'center' : 'space-between', alignItems: 'center' }}>
            {!isCollapsed && <S.SectionTitle>Navigation</S.SectionTitle>}
            <Button
              variant="default"
              size="iconOnly"
              onClick={onToggleCollapse}
              title="Toggle Sidebar"
              iconLeft={<SideBarIcon />}
            />
          </div>
        )}

        <S.Content>
          {!isCollapsed && mode !== "desktop" && <S.SectionTitle>Navigation</S.SectionTitle>}

          <S.NavSection>
            {navItems.map((n) => (
              <Button
                key={n}
                variant="default"
                size="fill"
                active={activeNav === n}
                collapsed={isCollapsed}
                onClick={() => handleNavSelection(n)}
                title={isCollapsed ? n : undefined}
              >
                <ButtonIconWrapper>{getIcon(n)}</ButtonIconWrapper>
                <ButtonTextWrapper $collapsed={isCollapsed}>
                  {n}
                </ButtonTextWrapper>
              </Button>
            ))}
          </S.NavSection>

          {!isCollapsed && (
            <>
              <S.SectionTitle>Einstellungen</S.SectionTitle>

              <S.NavSection>
                <Button
                  variant="default"
                  size="fill"
                  collapsed={isCollapsed}>
                  <ButtonIconWrapper><SettingsIcon /></ButtonIconWrapper>
                  <ButtonTextWrapper $collapsed={isCollapsed}>
                    Einstellungen
                  </ButtonTextWrapper>
                </Button>

                <Button
                  variant="default"
                  size="fill"
                  collapsed={isCollapsed}
                  onClick={() => handleNavSelection("Shortcuts")}>
                  <ButtonIconWrapper><ShortcutsIcon /></ButtonIconWrapper>
                  <ButtonTextWrapper $collapsed={isCollapsed}>
                    Shortcuts
                  </ButtonTextWrapper>
                </Button>

                <Button
                  variant="default"
                  size="fill"
                  collapsed={isCollapsed}>
                  <ButtonIconWrapper><MapIcon /></ButtonIconWrapper>
                  <ButtonTextWrapper $collapsed={isCollapsed}>
                    Karte
                  </ButtonTextWrapper>
                </Button>

                <Button
                  variant="default"
                  size="fill"
                  collapsed={isCollapsed}>
                  <ButtonIconWrapper><NewChatIcon /></ButtonIconWrapper>
                  <ButtonTextWrapper $collapsed={isCollapsed}>
                    Neuen Chat starten
                  </ButtonTextWrapper>
                </Button>
              </S.NavSection>
            </>
          )}
        </S.Content>
        {/* THEME SWITCHER */}
        <S.Footer $isCollapsed={isCollapsed}>
          {!isCollapsed && <S.FooterHint>Theme</S.FooterHint>}

          <S.ThemeButtonGroup $isCollapsed={isCollapsed}>
            <S.SegmentButton
              $active={themeMode === "light"}
              onClick={() => toggleMode("light")}
              title="Light Mode"
            >
              <LightModeIcon /> {!isCollapsed && "Light"}
            </S.SegmentButton>

            <S.SegmentButton
              $active={themeMode === "system"}
              onClick={() => toggleMode("system")}
              title="System Mode"
            >
              <SystemModeIcon /> {!isCollapsed && "System"}
            </S.SegmentButton>

            <S.SegmentButton
              $active={themeMode === "dark"}
              onClick={() => toggleMode("dark")}
              title="Dark Mode"
            >
              <DarkModeIcon /> {!isCollapsed && "Dark"}
            </S.SegmentButton>
          </S.ThemeButtonGroup>
        </S.Footer>
      </S.Sidebar>
    </>
  );
};

export default Sidebar;
