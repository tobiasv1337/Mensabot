import React, { useEffect, useState, useMemo, useRef } from "react";
import { MensaBotClient } from "../services/api";
import { useTheme } from "styled-components";
import * as S from "./ProjectFactsPage.styles";
import heroImageLight from "../assets/ChatPageImageLight.jpeg";
import heroImageDark from "../assets/ChatPageImageDark.jpeg";
import * as P from "../components/page/PageHero.styles";
import * as PS from "../components/page/PageSearch.styles";

import { useTranslation } from "react-i18next";
import {
    MensenIcon,
    StarIcon,
    CitiesIcon,
    GraduationCapIcon,
    MCPIcon,
    OpenSourceIcon,
    ShortcutsIcon,
} from "../components/icons";

const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? "";

const ProjectFactsPage: React.FC = () => {
    const { t } = useTranslation();
    const theme = useTheme();
    const heroImage = theme.mode === 'dark' ? heroImageDark : heroImageLight;

    // Logic to determine if we should force full viewport height for the upper part
    const [isFullScreen, setIsFullScreen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const lowerRef = useRef<HTMLElement>(null);

    const client = useMemo(() => new MensaBotClient(API_BASE_URL), []);
    const [totalCanteens, setTotalCanteens] = useState<number | null>(null);
    const [totalCities, setTotalCities] = useState<number | null>(null);

    useEffect(() => {
        const checkHeight = () => {
            if (wrapperRef.current && lowerRef.current) {
                // Get the natural height of the wrapper content (without min-height: 100vh applied yet if possible)
                // However, reading scrollHeight or offsetHeight when it MIGHT be 100vh is tricky.
                // Better approach: Check if (Window Height - Lower Section Height) < Wrapper Natural Height?
                // Actually, simply: If (WrapperContent + LowerSection) > WindowHeight, then Wrapper should be 100vh (pushing Lower down).
                // If they fit, Wrapper is Natural Height.

                // We need to measure natural heights.
                const wrapperHeight = wrapperRef.current.scrollHeight;
                const lowerHeight = lowerRef.current.scrollHeight;
                const totalContentHeight = wrapperHeight + lowerHeight;

                // If total content fits in window, we DON'T need full screen force (so they sit together).
                // If total content is taller than window, we force wrapper to be 100vh so it takes up the full initial view.
                setIsFullScreen(totalContentHeight > window.innerHeight);
            }
        };

        checkHeight();
        window.addEventListener('resize', checkHeight);
        return () => window.removeEventListener('resize', checkHeight);
    }, [totalCanteens, totalCities]); // Re-run when content might change (stats loaded)

    useEffect(() => {
        const fetchStats = async () => {
            try {
                // Fetch with empty query to get global stats from index
                const response = await client.searchCanteens({
                    query: "",
                    page: 1,
                    perPage: 1, // Minimize data transfer, we only need the index stats
                });
                setTotalCanteens(response.index.total_canteens);
                setTotalCities(response.index.total_cities);
            } catch (error) {
                console.error("Failed to fetch project stats:", error);
            }
        };

        fetchStats();
    }, [client]);

    // Data for the upper section cards
    const facts = [
        {
            id: 1,
            icon: <GraduationCapIcon />,
            title: t('projectFacts.facts.studentProject.title'),
            description: t('projectFacts.facts.studentProject.description')
        },
        {
            id: 2,
            icon: <MCPIcon />,
            title: t('projectFacts.facts.mcp.title'),
            description: t('projectFacts.facts.mcp.description')
        },
        {
            id: 3,
            icon: <OpenSourceIcon />,
            title: t('projectFacts.facts.openSource.title'),
            description: t('projectFacts.facts.openSource.description')
        },
        {
            id: 4,
            icon: <ShortcutsIcon />,
            title: t('projectFacts.facts.fastReliable.title'),
            description: t('projectFacts.facts.fastReliable.description')
        }
    ];

    // Data for the lower section buttons
    const stats = [
        { id: 1, label: t('projectFacts.stats.cities'), value: totalCities ?? "500+", icon: <CitiesIcon /> },
        { id: 2, label: t('projectFacts.stats.mensen'), value: totalCanteens ?? "1000+", icon: <MensenIcon /> },
        { id: 3, label: t('projectFacts.stats.stars'), value: "3,41", icon: <StarIcon /> },
    ];

    return (
        <S.PageContainer>
            <S.ScreenWrapper ref={wrapperRef} $fullScreen={isFullScreen}>
                <P.HeroCard>
                    <P.HeroEyebrow>{t('projectFacts.eyebrow')}</P.HeroEyebrow>
                    <P.HeroTitle>{t('projectFacts.title')}</P.HeroTitle>
                </P.HeroCard>
                <S.UpperSection>
                    <S.ImageContainer>
                        <img src={heroImage} alt="MensaBot Project Visualization" />
                    </S.ImageContainer>
                    <S.ContentColumn>
                        <S.InteractiveCardsGrid>
                            {facts.map((fact, index) => (
                                <S.StatCard key={fact.id} style={{ animationDelay: `${index * 0.1}s` }}>
                                    <PS.CardIcon>{fact.icon}</PS.CardIcon>
                                    <PS.CardTitle>{fact.title}</PS.CardTitle>
                                    <PS.CardText>{fact.description}</PS.CardText>
                                </S.StatCard>
                            ))}
                        </S.InteractiveCardsGrid>
                    </S.ContentColumn>
                </S.UpperSection>
            </S.ScreenWrapper>

            <S.LowerSection ref={lowerRef}>
                <P.HeroCard>
                    <P.HeroEyebrow>{t('projectFacts.eyebrow')}</P.HeroEyebrow>
                    <P.HeroTitle>{t('projectFacts.statsTitle')}</P.HeroTitle>
                </P.HeroCard>
                <S.StatsGrid>
                    {stats.map((stat, index) => (
                        <S.StatCard key={stat.id} style={{ animationDelay: `${0.2 + (index * 0.1)}s` }}>
                            <S.FlexContainer>
                                <S.IconWrapper>
                                    {(stat as any).icon}
                                </S.IconWrapper>
                                <S.Value>{stat.value}</S.Value>
                            </S.FlexContainer>
                            <S.StatLabel>{stat.label}</S.StatLabel>
                        </S.StatCard>
                    ))}
                </S.StatsGrid>
            </S.LowerSection>
        </S.PageContainer>
    );
};

export default ProjectFactsPage;
