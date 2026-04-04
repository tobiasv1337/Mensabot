import React, { useState, useCallback, useRef, useEffect } from "react";
import { useAppShellContext } from "@/layouts/AppShell/useAppShellContext";
import { useTheme } from "styled-components";
import * as S from "./AboutPage.styles";
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
import profileStefan from "@/assets/profilePictures/Stefan.jpg";
//import profileChristos from "@/assets/profilePictures/Christos.";
//import profileMaximilian from "@/assets/profilePictures/Maximilian.";
//import profileNils from "@/assets/profilePictures/Nils.";
//import profileTamim from "@/assets/profilePictures/Tamim.";


// Map creator index → imported image. Add entries here as pictures become available.
const creatorImages: Record<number, string> = {
    0: profileTobias,
    1: profileJudith,
    //2: profileMaximilian,
    //3: profileNils,
    //4: profileChristos,
    //5: profileTamim,
    6: profileStefan,
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

const AboutPage: React.FC = () => {
    const { t } = useTranslation();
    const { isOffline } = useAppShellContext();
    const theme = useTheme();
    const heroImage = theme.mode === 'dark' ? heroImageDark : heroImageLight;
    const LinkedInLogo = theme.mode === 'dark' ? LinkedInLogoWhite : LinkedInLogoBlack;
    const GitHubLogo = theme.mode === 'dark' ? GitHubLogoWhite : GitHubLogoBlack;
    const { totalCanteens, totalCities } = useProjectStats(isOffline);

    // Data for the upper section cards

    const factsicon: Record<number, React.ReactNode> = {
        0: <GraduationCapIcon />,
        1: <MCPIcon />,
        2: <OpenSourceIcon />,
        3: <ShortcutsIcon />
    };

    interface FactAction {
        icon: React.ReactNode;
        label: string;
        href: string;
    }

    interface FactItem {
        id: number;
        icon: React.ReactNode;
        title: string;
        description: string;
        action?: FactAction;
    }

    const facts: FactItem[] = Array.from({ length: 4 }, (_, i) => {
        const fact: FactItem = {
            id: i + 1,
            icon: factsicon[i],
            title: t(`about.facts.${i}.title`),
            description: t(`about.facts.${i}.description`)
        };

        if (i === 2) {
            fact.action = {
                icon: <GitHubLogo />,
                label: t('about.githubButton'),
                href: 'https://github.com/tobiasv1337/Mensabot'
            };
        }

        return fact;
    });

    const creators = Array.from({ length: 7 }, (_, i) => ({
        id: i + 1,
        name: t(`about.creators.${i}.name`),
        role: t(`about.creators.${i}.role`),
        description: t(`about.creators.${i}.description`),
        github: t(`about.creators.${i}.github`),
        linkedin: t(`about.creators.${i}.linkedin`),
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
        { id: 1, label: t('about.stats.cities'), value: totalCities ?? "500+", icon: <CitiesIcon /> },
        { id: 2, label: t('about.stats.mensen'), value: totalCanteens ?? "1000+", icon: <MensenIcon /> },
        { id: 3, label: t('about.stats.stars'), value: "3,41", icon: <StarIcon /> },
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
        setCarouselIndex(prev => {
            if (prev <= 0) return prev;
            return prev - 1;
        });
    }, []);

    const goRight = useCallback(() => {
        setCarouselIndex(prev => {
            if (prev >= creatorsCount * 5 - visibleCount) return prev;
            return prev + 1;
        });
    }, [creatorsCount, visibleCount]);

    const handleTransitionEnd = () => {
        if (carouselIndex <= creatorsCount || carouselIndex >= creatorsCount * 3) {
            // Instantly snap to the equivalent slide in the exact middle zone 
            // (using modulo ensures robustness against extreme rapid clicking where index exceeds block bounds)
            setIsTransitioning(false);
            setCarouselIndex(prev => {
                const offsetInBlock = prev % creatorsCount;
                const positiveOffset = offsetInBlock < 0 ? offsetInBlock + creatorsCount : offsetInBlock;
                return creatorsCount * 2 + positiveOffset;
            });
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
            <S.ScreenWrapper>
                <P.HeroCard>
                    <P.HeroEyebrow>{t('about.eyebrow')}</P.HeroEyebrow>
                    <P.HeroTitle>{t('about.title')}</P.HeroTitle>
                </P.HeroCard>
                <S.UpperSection>
                    <S.ImageContainer>
                        <img src={heroImage} alt={t('about.imageAlt')} />
                    </S.ImageContainer>
                    <S.ContentColumn>
                        <S.InteractiveCardsGrid>
                            {facts.map((fact, index) => (
                                <S.StatCard key={fact.id} style={{ animationDelay: `${index * 0.1}s` }}>
                                    <PS.CardIcon>{fact.icon}</PS.CardIcon>
                                    <PS.CardTitle>{fact.title}</PS.CardTitle>
                                    <PS.CardText>{fact.description}</PS.CardText>
                                    {fact.action && (
                                        <Button
                                            variant="default"
                                            iconLeft={fact.action.icon}
                                            text={fact.action.label}
                                            onClick={() => { window.open(fact.action?.href, '_blank', 'noopener,noreferrer'); }}
                                        />
                                    )}
                                </S.StatCard>
                            ))}
                        </S.InteractiveCardsGrid>
                    </S.ContentColumn>
                </S.UpperSection>
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
            </S.ScreenWrapper>

            <S.ScreenWrapper>
                <P.HeroCard>
                    <P.HeroEyebrow>{t('about.eyebrow')}</P.HeroEyebrow>
                    <P.HeroTitle>{t('about.creatorTitle')}</P.HeroTitle>
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
                                                onClick={() => window.open(creator.github, '_blank', 'noopener,noreferrer')}
                                                aria-label={`${creator.name} GitHub`}
                                                variant="surfaceInset"
                                                title="GitHub"
                                                iconLeft={<GitHubLogo />}
                                                size="iconOnly"
                                            />
                                        )}
                                        {creator.linkedin && (
                                            <Button
                                                onClick={() => window.open(creator.linkedin, '_blank', 'noopener,noreferrer')}
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
        </S.PageContainer>
    );
};

export default AboutPage;
