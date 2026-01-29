import styled from "styled-components";

export const ChatWrapper = styled.section`
    position: relative;
    height: 100%;
    min-height: 0;
    width: 100%;

    display: flex;
    flex-direction: column;
    overflow: hidden;

    background: transparent;
`;

export const TopBar = styled.div`
    position: relative;
    z-index: 10;

    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;

    flex-wrap: nowrap; /* ✅ keep everything on one row */

    padding: 12px 16px;

    background: color-mix(in srgb, ${({ theme }) => theme.surfaceCard} 78%, transparent);
    border-bottom: 1px solid color-mix(in srgb, ${({ theme }) => theme.textMuted} 22%, transparent);

    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
`;

export const FiltersArea = styled.div`
    position: relative;
    z-index: 10;

    padding: 12px 16px;

    background: color-mix(in srgb, ${({ theme }) => theme.surfaceCard} 78%, transparent);
    border-bottom: 1px solid color-mix(in srgb, ${({ theme }) => theme.textMuted} 22%, transparent);

    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
`;

export const FiltersBar = styled.div`
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
    min-width: 0;
`;

export const MessagesContainer = styled.div`
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;

    position: relative;
    z-index: 1;

    padding: 16px;
    scroll-behavior: smooth;
`;

export const BottomArea = styled.div`
    position: relative;
    z-index: 10;

    padding: 12px 16px;
    display: grid;
    gap: 8px;

    background: color-mix(in srgb, ${({ theme }) => theme.surfaceCard} 78%, transparent);
    border-top: 1px solid color-mix(in srgb, ${({ theme }) => theme.textMuted} 22%, transparent);

    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
`;

export const NewChatButton = styled.button`
    padding: 6px 12px;
    border-radius: 10px;

    font-size: 13px;
    font-weight: 600;

    color: ${({ theme }) => theme.textOnInset};
    background: color-mix(in srgb, ${({ theme }) => theme.surfaceInset} 88%, transparent);
    border: 1px solid color-mix(in srgb, ${({ theme }) => theme.textMuted} 24%, transparent);

    cursor: pointer;

    &:hover:not(:disabled) {
        background: color-mix(in srgb, ${({ theme }) => theme.surfaceInset} 96%, transparent);
    }

    &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }
`;
