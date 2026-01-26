import styled from "styled-components";
import bgImage from "../../assets/background.png";

export const ChatWrapper = styled.section`
    position: relative;
    height: 89vh; /* Ensure it takes full viewport height */
    width: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden; /* Prevents the whole page from scrolling */

    background-image: url("${bgImage}");
    background-size: cover;
    background-position: center;

    &::before {
        content: "";
        position: absolute;
        inset: 0;
        background: rgba(30, 30, 30, 0.9);
        z-index: 0;
    }
`;

export const TopBar = styled.div`
    position: relative;
    z-index: 10;
    display: flex;
    justify-content: flex-end;
    align-items: center;
    padding: 12px 16px;
    background: rgba(30, 30, 30, 0.4); /* Optional: adds contrast to sticky bar */
    backdrop-filter: blur(10px);
`;

/* NEW: Filters container (top area) */
export const FiltersArea = styled.div`
    position: relative;
    z-index: 10;
    padding: 12px 16px;
    background: rgba(30, 30, 30, 0.4);
    backdrop-filter: blur(10px);
`;

export const FiltersBar = styled.div`
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
`;

// NEW: This container handles the actual scrolling
export const MessagesContainer = styled.div`
    flex-grow: 1; /* Takes up all available space between top and bottom */
    overflow-y: auto; /* This is the ONLY part that scrolls */
    position: relative;
    z-index: 1;
    padding: 16px;

    /* Smooth scrolling */
    scroll-behavior: smooth;
`;

export const BottomArea = styled.div`
    position: relative;
    z-index: 10;
    padding: 12px 16px;
    display: grid;
    gap: 8px;
    background: rgba(30, 30, 30, 0.4);
    backdrop-filter: blur(10px);
`;

export const NewChatButton = styled.button`
    /* ... your existing styles ... */
    padding: 6px 12px;
    border-radius: 10px;
    font-size: 13px;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.9);
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.12);
    cursor: pointer;

    &:hover:not(:disabled) {
        background: rgba(255, 255, 255, 0.14);
    }
`;
