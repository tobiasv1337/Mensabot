import styled from "styled-components";

export const PageRoot = styled.div`
    min-height: 100vh;
    background: ${({ theme }) => theme.surfacePage};
    color: ${({ theme }) => theme.textOnPage};
`;

export const ContentWrap = styled.main`
    position: relative;
    min-height: calc(100vh - 64px);
    padding: 32px 16px;

    display: grid;
    place-items: center;

    /* same "glass" feeling as the chat bars */
    background: color-mix(in srgb, ${({ theme }) => theme.surfacePage} 35%, transparent);
`;

export const ContentInner = styled.section`
    width: min(1100px, 96vw);   /* was 860px */
    border-radius: 22px;
    padding: 44px 40px;        /* more breathing room */

    background: color-mix(in srgb, ${({ theme }) => theme.surfaceCard} 82%, transparent);
    border: 1px solid color-mix(in srgb, ${({ theme }) => theme.textMuted} 18%, transparent);

    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);

    box-shadow:
            0 20px 60px color-mix(in srgb, ${({ theme }) => theme.textDark} 20%, transparent),
            0 8px 24px color-mix(in srgb, ${({ theme }) => theme.textDark} 12%, transparent);
`;

export const LogoImg = styled.img`
    height: 64px;   /* vorher 34px */
    width: auto;
    margin: 0 auto 20px;
    display: block;

    filter: drop-shadow(
            0 6px 18px
            color-mix(in srgb, ${({ theme }) => theme.textDark} 18%, transparent)
    );
`;

export const Title = styled.h1`
    margin: 0 0 12px;
    text-align: center;

    font-size: 32px;
    font-weight: 800;
    letter-spacing: -0.02em;

    color: ${({ theme }) => theme.textOnPage};
`;

export const Paragraph = styled.p`
    margin: 0 auto 12px;
    max-width: 720px;
    text-align: center;

    color: ${({ theme }) => theme.textSecondary};
    font-size: 14px;
    line-height: 1.65;
`;

export const MemberList = styled.div`
    margin-top: 18px;

    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    justify-content: center;
`;

export const MemberPill = styled.div`
    padding: 8px 12px;
    border-radius: 999px;

    background: color-mix(in srgb, ${({ theme }) => theme.surfaceInset} 82%, transparent);
    border: 1px solid color-mix(in srgb, ${({ theme }) => theme.textMuted} 22%, transparent);

    color: ${({ theme }) => theme.textOnInset};
    font-size: 13px;
    font-weight: 600;
`;
