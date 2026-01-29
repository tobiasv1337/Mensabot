import styled from "styled-components";
import bgDark from "../assets/background.png";
import bgLight from "../assets/background - LightMode.png";

export const PageRoot = styled.div`
    min-height: 100vh;
    background: ${({ theme }) => theme.surfacePage};
    color: ${({ theme }) => theme.textOnPage};
`;

export const HeroWrap = styled.main`
    position: relative;
    min-height: calc(100vh - 64px);
    display: grid;
    place-items: center;
    padding: 32px 16px;
    overflow: hidden;

    --isLight: ${({ theme }) => (theme.textOnPage === theme.textDark ? 1 : 0)};

    &::before {
        content: "";
        position: absolute;
        inset: 0;

        background-image: url(${({ theme }) =>
                theme.textOnPage === theme.textDark ? bgLight : bgDark});

        background-size: cover;
        background-position: center;

        filter: none;
        opacity: 1;
        pointer-events: none;
    }

    &::after {
        content: "";
        position: absolute;
        inset: 0;

        background: color-mix(
                in srgb,
                ${({ theme }) => theme.surfacePage}
                calc(10% + (1 - var(--isLight)) * 45%),
                transparent
        );

        pointer-events: none;
    }
`;



export const HeroCard = styled.section`
    position: relative;
    z-index: 1;
    width: min(860px, 92vw);
    padding: 40px 16px;
    text-align: center;

    &::before {
        content: "";
        position: absolute;
        inset: -40px -16px;

        background: radial-gradient(
                circle at center,
                color-mix(in srgb, ${({ theme }) => theme.accent2} 22%, transparent) 0%,
                color-mix(in srgb, ${({ theme }) => theme.accent1} 14%, transparent) 30%,
                transparent 65%
        );

        filter: blur(2px);
        z-index: -1;
    }
`;

export const Pill = styled.div`
    display: inline-flex;
    align-items: center;
    gap: 10px;

    padding: 8px 14px;
    border-radius: 999px;

    background: color-mix(in srgb, ${({ theme }) => theme.surfaceCard} 55%, transparent);
    border: 1px solid color-mix(in srgb, ${({ theme }) => theme.accent2} 55%, transparent);
    color: ${({ theme }) => theme.textOnPage};

    font-size: 12px;
    letter-spacing: 0.2px;
`;

export const PillIcon = styled.span`
    display: inline-grid;
    place-items: center;

    width: 22px;
    height: 22px;
    border-radius: 7px;

    border: 1px solid color-mix(in srgb, ${({ theme }) => theme.accent2} 55%, transparent);
    color: ${({ theme }) => theme.textOnPage};
`;

export const Title = styled.h1`
    margin: 26px 0 14px;
    line-height: 0.95;
    font-weight: 800;
    font-size: clamp(56px, 9vw, 104px);

    span {
        display: block;
        background: linear-gradient(
                180deg,
                ${({ theme }) => theme.accent3} 0%,
                ${({ theme }) => theme.accent2} 45%,
                ${({ theme }) => theme.accent1} 100%
        );
        -webkit-background-clip: text;
        background-clip: text;
        color: transparent;

        text-shadow: 0 12px 40px color-mix(in srgb, ${({ theme }) => theme.textDark} 28%, transparent);
    }
`;
export const Subtitle = styled.p`
    margin: 0 auto 26px;
    max-width: 720px;

    color: ${({ theme }) =>
            theme.textOnPage === theme.textDark
                    ? `color-mix(in srgb, ${theme.textDark} 88%, ${theme.surfacePage})`
                    : theme.textSecondary};

    font-size: 14.5px;
    font-weight: 500;
    line-height: 1.6;

    /* crisp readability */
    text-shadow:
            0 1px 0 color-mix(in srgb, ${({ theme }) => theme.surfacePage} 80%, transparent),
            0 6px 14px color-mix(in srgb, ${({ theme }) => theme.textDark} 20%, transparent);

    /* subtle soft contrast plate */
    padding: 4px 10px;
    border-radius: 10px;
    background: color-mix(in srgb, ${({ theme }) => theme.surfacePage} 35%, transparent);
    backdrop-filter: blur(2px);
`;

export const CTAButton = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 10px;

    padding: 12px 22px;
    border-radius: 10px;
    border: 0;
    cursor: pointer;

    font-weight: 700;
    color: ${({ theme }) => theme.textOnAccent1};
    background: ${({ theme }) => theme.accent1};

    box-shadow:
            0 12px 30px color-mix(in srgb, ${({ theme }) => theme.accent1} 22%, transparent),
            0 10px 30px color-mix(in srgb, ${({ theme }) => theme.textDark} 30%, transparent);

    transition: transform 0.15s ease, filter 0.15s ease;

    &:hover {
        transform: translateY(-1px);
        filter: brightness(1.03);
    }

    &:active {
        transform: translateY(0px);
        filter: brightness(0.98);
    }
`;

export const CTAIcon = styled.span`
    display: inline-grid;
    place-items: center;
`;
