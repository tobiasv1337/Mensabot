import React, { useState, useCallback, useRef, useEffect } from "react";
import { useAppShellContext } from "@/layouts/AppShell/useAppShellContext";
import { useTheme } from "styled-components";
import * as S from "./ProjectFactsPage.styles";
import heroImageLight from "@/assets/ChatPageImageLight.jpeg";
import heroImageDark from "@/assets/ChatPageImageDark.jpeg";
import * as P from "@/shared/ui/page/PageHero.styles";
import * as PS from "@/shared/ui/page/PageSearch.styles";
import { Button } from "@/shared/ui/button/Button";
import { useProjectStats } from "./useProjectStats";
import { useTranslation } from "react-i18next";
import {
    MensenIcon,
    StarIcon,
    CitiesIcon,
    GraduationCapIcon,
    MCPIcon,
    OpenSourceIcon,
    ShortcutsIcon,
    ChevronLeft,
    ChevronRight
} from "@/shared/ui/icons";
import {
    GitHubLogoBlack, GitHubLogoWhite
} from "@/shared/ui/iconsLogos";

import LinkedInLogoBlack from "@/assets/LinkedInBug-Black.png";
import LinkedInLogoWhite from "@/assets/LinkedInBug-White.png";

/* ── Profile pictures (static imports for Vite) ── */
import profileJudith from "@/assets/profilePictures/Judith.png";
import profileTobias from "@/assets/profilePictures/Tobias_Orange.png";


// Map creator index → imported image. Add entries here as pictures become available.
const creatorImages: Record<number, string> = {
    0: profileTobias,
    1: profileJudith,
};


/* ── Helper: get initials from a name ── */
const getInitials = (name: string) => {
    const parts = name.split(' ').filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0][0].toUpperCase();
    // Skip titles like "Dr." "Ing."
    const meaningful = parts.filter(p => !p.endsWith('.'));
    if (meaningful.length >= 2) {
        return (meaningful[0][0] + meaningful[meaningful.length - 1][0]).toUpperCase();
    }
    return parts[0][0].toUpperCase();
};

const ProjectFactsPage: React.FC = () => {
    const { t } = useTranslation();
    const { isOffline } = useAppShellContext();
    const theme = useTheme();
    const heroImage = theme.mode === 'dark' ? heroImageDark : heroImageLight;
    const LinkedInLogo = theme.mode === 'dark' ? LinkedInLogoWhite : LinkedInLogoBlack;
    const GitHubLogo = theme.mode === 'dark' ? GitHubLogoWhite : GitHubLogoBlack;
    const { wrapperRef, lowerRef, isFullScreen, totalCanteens, totalCities } = useProjectStats(isOffline);

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
            description: t('projectFacts.facts.openSource.description'),
            action: {
                icon: <GitHubLogo />,
                label: t('projectFacts.githubButton'),
                href: 'https://github.com/tobiasv1337/Mensabot',
            },
        },
        {
            id: 4,
            icon: <ShortcutsIcon />,
            title: t('projectFacts.facts.fastReliable.title'),
            description: t('projectFacts.facts.fastReliable.description')
        }
    ];

    const creators = Array.from({ length: 7 }, (_, i) => ({
        id: i + 1,
        name: t(`projectFacts.creators.${i}.name`),
        role: t(`projectFacts.creators.${i}.role`),
        description: t(`projectFacts.creators.${i}.description`),
        github: t(`projectFacts.creators.${i}.github`),
        linkedin: t(`projectFacts.creators.${i}.linkedin`),
        image: creatorImages[i],  // undefined when no picture available
    }));

    // Data for the lower section buttons
    interface StatItem {
        id: number;
        label: string;
        value: string | number;
        icon: React.ReactNode;
    }

    const stats: StatItem[] = [
        { id: 1, label: t('projectFacts.stats.cities'), value: totalCities ?? "500+", icon: <CitiesIcon /> },
        { id: 2, label: t('projectFacts.stats.mensen'), value: totalCanteens ?? "1000+", icon: <MensenIcon /> },
        { id: 3, label: t('projectFacts.stats.stars'), value: "3,41", icon: <StarIcon /> },
    ];

    /* ── Carousel logic ── */
    const creatorsCount = creators.length;
    // Render 5 copies to have a large buffer on both sides for rapid clicking
    const extendedCreators = [...creators, ...creators, ...creators, ...creators, ...creators];

    // Start at the exact middle block (creatorsCount * 2)
    const [carouselIndex, setCarouselIndex] = useState(creatorsCount * 2);
    const [isTransitioning, setIsTransitioning] = useState(true);
    const viewportRef = useRef<HTMLDivElement>(null);
    const [visibleCount, setVisibleCount] = useState(3);

    // Drag states
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState(0);
    const startXRef = useRef<number | null>(null);

    // Responsively determine how many cards to show
    useEffect(() => {
        const update = () => {
            const w = viewportRef.current?.offsetWidth ?? window.innerWidth;
            if (w <= 560) setVisibleCount(1);
            else if (w <= 900) setVisibleCount(2);
            else setVisibleCount(3);
        };
        update();
        window.addEventListener('resize', update);
        return () => window.removeEventListener('resize', update);
    }, []);

    const goLeft = useCallback(() => {
        setCarouselIndex(prev => prev - 1);
    }, []);

    const goRight = useCallback(() => {
        setCarouselIndex(prev => prev + 1);
    }, []);

    const handleTransitionEnd = () => {
        if (carouselIndex <= creatorsCount) {
            // Snap forward into the middle zone
            setIsTransitioning(false);
            setCarouselIndex(prev => prev + creatorsCount);
        } else if (carouselIndex >= creatorsCount * 3) {
            // Snap backward into the middle zone
            setIsTransitioning(false);
            setCarouselIndex(prev => prev - creatorsCount);
        }
    };

    // Re-enable transition right after a snap
    useEffect(() => {
        if (!isTransitioning) {
            const timer = requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    setIsTransitioning(true);
                });
            });
            return () => cancelAnimationFrame(timer);
        }
    }, [isTransitioning]);

    // Calculate offset based on card width + gap
    const getOffset = () => {
        if (!viewportRef.current) return 0;
        const viewportWidth = viewportRef.current.offsetWidth;
        const gap = 24; // 1.5rem = 24px
        const cardWidth = (viewportWidth - gap * (visibleCount - 1)) / visibleCount;
        return -(carouselIndex * (cardWidth + gap)) + dragOffset;
    };

    // Drag handlers
    const handleDragStart = (clientX: number) => {
        setIsTransitioning(false);
        setIsDragging(true);
        startXRef.current = clientX;
    };

    const handleDragMove = (clientX: number) => {
        if (!isDragging || startXRef.current === null) return;
        setDragOffset(clientX - startXRef.current);
    };

    const handleDragEnd = () => {
        if (!isDragging) return;
        setIsDragging(false);
        setIsTransitioning(true);

        const threshold = 50;

        if (dragOffset > threshold) {
            goLeft();
        } else if (dragOffset < -threshold) {
            goRight();
        }

        setDragOffset(0);
        startXRef.current = null;
    };

    return (
        <S.PageContainer>
            <S.ScreenWrapper ref={wrapperRef} $fullScreen={isFullScreen}>
                <P.HeroCard>
                    <P.HeroEyebrow>{t('projectFacts.eyebrow')}</P.HeroEyebrow>
                    <P.HeroTitle>{t('projectFacts.title')}</P.HeroTitle>
                </P.HeroCard>
                <S.UpperSection>
                    <S.ImageContainer>
                        <img src={heroImage} alt={t('projectFacts.imageAlt')} />
                    </S.ImageContainer>
                    <S.ContentColumn>
                        <S.InteractiveCardsGrid>
                            {facts.map((fact, index) => (
                                <S.StatCard key={fact.id} style={{ animationDelay: `${index * 0.1}s` }}>
                                    <PS.CardIcon>{fact.icon}</PS.CardIcon>
                                    <PS.CardTitle>{fact.title}</PS.CardTitle>
                                    <PS.CardText>{fact.description}</PS.CardText>
                                    {'action' in fact && fact.action && (
                                        <Button
                                            variant="default"
                                            iconLeft={fact.action.icon}
                                            text={fact.action.label}
                                            onClick={() => { window.open(fact.action.href, '_blank'); }}
                                        />
                                    )}
                                </S.StatCard>
                            ))}
                        </S.InteractiveCardsGrid>
                    </S.ContentColumn>
                </S.UpperSection>
            </S.ScreenWrapper>

            <S.ScreenWrapper ref={wrapperRef} $fullScreen={isFullScreen}>
                <P.HeroCard>
                    <P.HeroEyebrow>{t('projectFacts.eyebrow')}</P.HeroEyebrow>
                    <P.HeroTitle>{t('projectFacts.creatorTitle')}</P.HeroTitle>
                </P.HeroCard>

                <S.CarouselSection>
                    <S.CarouselArrow
                        $direction="left"
                        onClick={goLeft}
                        aria-label="Previous creator"
                    >
                        <ChevronLeft />
                    </S.CarouselArrow>

                    <S.CarouselViewport
                        ref={viewportRef}
                        $isDragging={isDragging}
                        onMouseDown={(e) => handleDragStart(e.clientX)}
                        onMouseMove={(e) => handleDragMove(e.clientX)}
                        onMouseUp={handleDragEnd}
                        onMouseLeave={handleDragEnd}
                        onTouchStart={(e) => handleDragStart(e.touches[0].clientX)}
                        onTouchMove={(e) => handleDragMove(e.touches[0].clientX)}
                        onTouchEnd={handleDragEnd}
                        onDragStart={(e) => e.preventDefault()}
                    >
                        <S.CarouselTrack
                            $offset={getOffset()}
                            $isTransitioning={isTransitioning}
                            onTransitionEnd={handleTransitionEnd}
                        >
                            {extendedCreators.map((creator, index) => (
                                <S.CreatorCard key={`${creator.id}-${index}`} style={{ animationDelay: `${(index % creatorsCount) * 0.08}s` }}>
                                    <S.CreatorAvatar>
                                        {creator.image ? (
                                            <img src={creator.image} alt={creator.name} />
                                        ) : (
                                            <S.AvatarFallback>
                                                {getInitials(creator.name)}
                                            </S.AvatarFallback>
                                        )}
                                    </S.CreatorAvatar>
                                    <S.CreatorName>{creator.name}</S.CreatorName>
                                    <S.CreatorRole>{creator.role}</S.CreatorRole>
                                    <S.CreatorDescription>{creator.description}</S.CreatorDescription>
                                    <S.SocialRow>
                                        {creator.github && (
                                            <Button
                                                onClick={() => window.open(creator.github, '_blank')}
                                                aria-label={`${creator.name} GitHub`}
                                                variant="surfaceInset"
                                                title="GitHub"
                                                iconLeft={<GitHubLogo />}
                                                size="iconOnly"
                                            />
                                        )}
                                        {creator.linkedin && (
                                            <Button
                                                onClick={() => window.open(creator.linkedin, '_blank')}
                                                aria-label={`${creator.name} LinkedIn`}
                                                variant="surfaceInset"
                                                title="LinkedIn"
                                                size="iconOnly"
                                                iconLeft={<span style={{ display: 'flex' }}><img src={LinkedInLogo} alt="LinkedIn" style={{ width: 20, height: 20, filter: 'none' }} /></span>}
                                            />
                                        )}
                                    </S.SocialRow>
                                </S.CreatorCard>
                            ))}
                        </S.CarouselTrack>
                    </S.CarouselViewport>

                    <S.CarouselArrow
                        $direction="right"
                        onClick={goRight}
                        aria-label="Next creator"
                    >
                        <ChevronRight />
                    </S.CarouselArrow>

                    <S.CarouselDots>
                        {creators.map((_, i) => (
                            <S.CarouselDot
                                key={i}
                                $active={i === (carouselIndex % creatorsCount)}
                                onClick={() => setCarouselIndex(creatorsCount * 2 + i)}
                                aria-label={`Go to slide ${i + 1}`}
                            />
                        ))}
                    </S.CarouselDots>
                </S.CarouselSection>
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
                                    {stat.icon}
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
