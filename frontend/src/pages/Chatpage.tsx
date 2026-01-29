import React, { useState } from "react";
import Header from "../components/header/header";
import Sidebar from "../components/sidebar/sidebar";
import type { NavItem } from "../components/header/header";
import * as S from "./Chatpage.styles";

import Chat from "../components/chat/Chat";
import { LandingHero } from "./Landingpage";
import { AboutContent } from "./Aboutpage";

//import Mensen from "./Mensen";
const NAV_ITEMS: NavItem[] = ["Home", "ChatBot", "Mensen", "Über Uns", "Kontakt"];

const ChatPage: React.FC = () => {
    const [activeNav, setActiveNav] = useState<NavItem>(NAV_ITEMS[0]);
    const [drawerOpen, setDrawerOpen] = useState(false);
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
                <S.BodyGrid $collapsed={isCollapsed}>
                    <S.SidebarSlot>
                        <Sidebar
                            mode="desktop"
                            drawerOpen={true}
                            isCollapsed={isCollapsed}
                            onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
                            onCloseDrawer={() => {}}
                            navItems={NAV_ITEMS}
                            activeNav={activeNav}
                            onNavClick={setActiveNav}
                        />
                    </S.SidebarSlot>

                    <S.Content>
                        {activeNav === "Home" && (
                            <LandingHero onStartChat={() => setActiveNav("ChatBot")} />
                        )}

                        {activeNav === "ChatBot" && <Chat />}

                        {activeNav === "Mensen" && <Chat/>}

                        {/* You can plug the other pages here later */}
                        {activeNav === "Über Uns" && <AboutContent />}
                        {activeNav === "Kontakt" && <div />}
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
