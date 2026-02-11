import React, { useEffect, useState, useMemo } from "react";
import { MensaBotClient } from "../services/api";
import { useTheme } from "styled-components";
import * as S from "./ProjectFactsPage.styles";
import heroImageLight from "../assets/ChatPageImageLight.jpeg";
import heroImageDark from "../assets/ChatPageImageDark.jpeg";

import { useTranslation } from "react-i18next";

const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? "";

const ProjectFactsPage: React.FC = () => {
    const { t } = useTranslation();
    const theme = useTheme();
    const heroImage = theme.mode === 'dark' ? heroImageDark : heroImageLight;

    const client = useMemo(() => new MensaBotClient(API_BASE_URL), []);
    const [totalCanteens, setTotalCanteens] = useState<number | null>(null);
    const [totalCities, setTotalCities] = useState<number | null>(null);

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
            icon: "🎓",
            title: t('projectFacts.facts.studentProject.title'),
            description: t('projectFacts.facts.studentProject.description')
        },
        {
            id: 2,
            icon: "🤖",
            title: t('projectFacts.facts.mcp.title'),
            description: t('projectFacts.facts.mcp.description')
        },
        {
            id: 3,
            icon: "🌍",
            title: t('projectFacts.facts.openSource.title'),
            description: t('projectFacts.facts.openSource.description')
        },
        {
            id: 4,
            icon: "⚡",
            title: t('projectFacts.facts.fastReliable.title'),
            description: t('projectFacts.facts.fastReliable.description')
        }
    ];

    // Data for the lower section buttons
    const stats = [
        { id: 1, label: t('projectFacts.stats.cities'), value: totalCities ?? "500+" },
        { id: 2, label: t('projectFacts.stats.mensen'), value: totalCanteens ?? "1000+" },
        { id: 3, label: t('projectFacts.stats.stars'), value: "⭐️ 4,5" },
    ];

    return (
        <S.PageContainer>
            <S.UpperSection>
                <S.ImageContainer>
                    <img src={heroImage} alt="MensaBot Project Visualization" />
                </S.ImageContainer>

                <S.ContentColumn>
                    <S.ContentBox>
                        <S.SectionEyebrow>{t('projectFacts.eyebrow')}</S.SectionEyebrow>
                        <S.SectionTitle>{t('projectFacts.title')}</S.SectionTitle>
                    </S.ContentBox>
                    <S.InteractiveCardsGrid>
                        {facts.map((fact, index) => (
                            <S.FactCard key={fact.id} style={{ animationDelay: `${index * 0.1}s` }}>
                                <S.CardIcon>{fact.icon}</S.CardIcon>
                                <S.CardTitle>{fact.title}</S.CardTitle>
                                <S.CardText>{fact.description}</S.CardText>
                            </S.FactCard>
                        ))}
                    </S.InteractiveCardsGrid>
                </S.ContentColumn>
            </S.UpperSection>

            <S.LowerSection>
                <S.SectionTitle style={{ textAlign: "center", marginBottom: "3rem" }}>
                    {t('projectFacts.statsTitle')}
                </S.SectionTitle>
                <S.StatsGrid>
                    {stats.map((stat, index) => (
                        <S.StatCard key={stat.id} style={{ animationDelay: `${0.2 + (index * 0.1)}s` }}>
                            <S.StatNumber>{stat.value}</S.StatNumber>
                            <S.StatLabel>{stat.label}</S.StatLabel>
                        </S.StatCard>
                    ))}
                </S.StatsGrid>
            </S.LowerSection>
        </S.PageContainer>
    );
};

export default ProjectFactsPage;
