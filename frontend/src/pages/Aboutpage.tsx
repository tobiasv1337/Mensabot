import React from "react";
import Header from "../components/header/header";
import type { NavItem } from "../components/header/header";
import * as S from "./Aboutpage.styles";

import tuLogo from "../assets/tu-berlin-logo-long-red.svg";

const NAV_ITEMS: NavItem[] = ["Home", "ChatBot", "Mensen", "Über Uns", "Kontakt"];

type TeamMember = {
    name: string;
    study?: string;
    extra?: string;
};

const TEAM: TeamMember[] = [
    { name: "Stefan Hillmann" },
    { name: "Tobias Veselsky" },
    { name: "Maximilian Krupper" },
    { name: "Judith Bucher" },
    { name: "Adrian Siebing" },
    { name: "Nils Ole Herbig" },
    { name: "Christos Labroussis" },
    { name: "Mohammed Tamim Ayach" },
];

interface AboutpageProps {
    activeNav: NavItem;
    onNavClick: (item: NavItem) => void;
    onToggleSidebar: () => void;
}

const Aboutpage: React.FC<AboutpageProps> = ({
                                                 activeNav,
                                                 onNavClick,
                                                 onToggleSidebar,
                                             }) => {
    return (
        <S.PageRoot>
            <Header
                activeNav={activeNav}
                navItems={NAV_ITEMS}
                onNavClick={onNavClick}
                onToggleSidebar={onToggleSidebar}
            />

            <S.ContentWrap>
                <S.ContentInner>
                    <S.LogoImg src={tuLogo} alt="Technische Universität Berlin" />

                    <S.Title>Lerne uns kennen!</S.Title>

                    <S.Paragraph>
                        Wir sind ein engagiertes Team, das innovative Ideen umsetzt und kreative
                        Lösungen entwickelt. Unser Ziel ist es, Technik und Gestaltung sinnvoll
                        zu verbinden und Projekte mit echtem Mehrwert zu schaffen.
                    </S.Paragraph>

                    <S.Paragraph>
                        Gemeinsam arbeiten wir offen, praxisorientiert und mit Freude an neuen
                        Herausforderungen.
                    </S.Paragraph>

                    <S.MemberList>
                        {TEAM.map((m) => (
                            <S.MemberPill key={m.name}>{m.name}</S.MemberPill>
                        ))}
                    </S.MemberList>
                </S.ContentInner>
            </S.ContentWrap>
        </S.PageRoot>
    );
};

export default Aboutpage;
