import React from "react";
import Header from "../components/header/header";
import type { NavItem } from "../components/header/header";
import * as S from "./Landingpage.styles";

const NAV_ITEMS: NavItem[] = ["Home", "ChatBot", "Mensen", "Über Uns", "Kontakt"];

type Props = {
    activeNav?: NavItem;
    onNavClick?: (item: NavItem) => void;
    onToggleSidebar?: () => void;
    onStartChat: () => void;

    /** When true: render only the hero content (no header, no full-page root). */
    embedded?: boolean;
};

export const LandingHero: React.FC<Pick<Props, "onStartChat">> = ({ onStartChat }) => {
    return (
        <S.HeroWrap>
            <S.HeroCard>
                <S.Pill>
                    <S.PillIcon aria-hidden="true">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path d="M7 9h10M7 13h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            <path
                                d="M20 14c0 1.105-.895 2-2 2H9l-5 4V6c0-1.105.895-2 2-2h12c1.105 0 2 .895 2 2v8z"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </S.PillIcon>
                    KI-gestützter Mensa Assistent
                </S.Pill>

                <S.Title>
                    <span>Mensa</span>
                    <span>Chat Bot</span>
                </S.Title>

                <S.Subtitle>
                    Finde spielend leicht das perfekte Gericht - personalisiert nach deinen Vorlieben und Allergenen
                </S.Subtitle>

                <S.CTAButton onClick={onStartChat}>
                    <S.CTAIcon aria-hidden="true">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                            <path d="M7 9h10M7 13h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            <path
                                d="M20 14c0 1.105-.895 2-2 2H9l-5 4V6c0-1.105.895-2 2-2h12c1.105 0 2 .895 2 2v8z"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </S.CTAIcon>
                    Start a new chat
                </S.CTAButton>
            </S.HeroCard>
        </S.HeroWrap>
    );
};

const Landingpage: React.FC<Props> = ({
                                          activeNav = "Home",
                                          onNavClick = () => {},
                                          onToggleSidebar = () => {},
                                          onStartChat,
                                          embedded = false,
                                      }) => {
    if (embedded) return <LandingHero onStartChat={onStartChat} />;

    return (
        <S.PageRoot>
            <Header
                activeNav={activeNav}
                navItems={NAV_ITEMS}
                onNavClick={onNavClick}
                onToggleSidebar={onToggleSidebar}
            />
            <LandingHero onStartChat={onStartChat} />
        </S.PageRoot>
    );
};

export default Landingpage;
