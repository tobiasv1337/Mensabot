import styled from "styled-components";
import { themes } from "../theme/colors";

import bgDark from "../assets/background.png";
import bgLight from "../assets/background - LightMode.png";

const HEADER_H = 80;
const isLight = (theme: any) => theme === themes.light;

export const PageRoot = styled.div`
    height: 100vh;
    height: 100dvh;
    min-height: 0;

    background: ${({ theme }) => theme.surfacePage};
    color: ${({ theme }) => theme.textOnPage};
`;

export const Shell = styled.div`
    padding-top: ${HEADER_H}px;

    height: 100%;
    min-height: 0;
`;

export const BodyGrid = styled.div<{ $collapsed?: boolean }>`
    display: grid;
    grid-template-columns: ${({ $collapsed }) => ($collapsed ? "72px" : "280px")} 1fr;

    height: calc(100vh - ${HEADER_H}px);
    height: calc(100dvh - ${HEADER_H}px);
    min-height: 0;

    overflow: hidden;
    transition: grid-template-columns 0.3s cubic-bezier(0.4, 0, 0.2, 1);

    @media (max-width: 1023px) {
        grid-template-columns: 1fr;
    }
`;

export const SidebarSlot = styled.div`
    display: none;

    @media (min-width: 1024px) {
        display: block;
        position: sticky;
        top: ${HEADER_H}px;

        height: calc(100vh - ${HEADER_H}px);
        height: calc(100dvh - ${HEADER_H}px);
        min-height: 0;

        background: ${({ theme }) => theme.surfacePage};
    }
`;

export const Content = styled.main`
    position: relative;

    height: 100%;
    min-height: 0;
    min-width: 0;

    overflow: hidden;
    padding: 0;

    display: flex;

    /* keep a neutral base */
    background: ${({ theme }) => theme.surfaceInset};
    color: ${({ theme }) => theme.textOnPage};

    &::before {
        content: "";
        position: absolute;
        inset: 0;

        background-image: ${({ theme }) => `url(${isLight(theme) ? bgLight : bgDark})`};
        background-size: cover;
        background-position: center;
        pointer-events: none;

        /* Light mode should look like the asset */
        opacity: ${({ theme }) => (isLight(theme) ? 1 : 0.28)};
        filter: ${({ theme }) => (isLight(theme) ? "none" : "blur(4px) saturate(0.95) brightness(0.78)")};
        transform: ${({ theme }) => (isLight(theme) ? "none" : "scale(1.04)")};
    }

    &::after {
        content: "";
        position: absolute;
        inset: 0;
        pointer-events: none;

        /* No wash in light mode, keep cinematic wash in dark mode */
        background: ${({ theme }) =>
                isLight(theme)
                        ? "linear-gradient(to bottom, rgba(0,0,0,0), rgba(0,0,0,0))"
                        : "linear-gradient(to bottom, rgba(0,0,0,0.62), rgba(0,0,0,0.62))"};
    }

    > * {
        position: relative;
        z-index: 1;

        flex: 1;
        min-height: 0;
        min-width: 0;
    }
`;
