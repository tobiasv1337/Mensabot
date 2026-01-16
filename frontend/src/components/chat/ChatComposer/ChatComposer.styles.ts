import styled from "styled-components";

export const Wrapper = styled.div`
    width: 100%;
`;

export const Grid = styled.div`
    display: grid;
    grid-template-columns: 40px 1fr;
    grid-template-rows: auto auto;
    gap: 8px 10px;
    align-items: start;
`;

export const PlusButton = styled.button`
    grid-row: 1 / span 2;

    height: 40px;
    width: 40px;
    border-radius: 12px;

    border: 1px solid rgba(255, 255, 255, 0.12);
    background: rgba(0, 0, 0, 0.25);
    backdrop-filter: blur(10px);

    color: rgba(255, 255, 255, 0.9);
    font-size: 18px;
    line-height: 1;

    cursor: pointer;

    &:hover:not(:disabled) {
        background: rgba(0, 0, 0, 0.35);
    }

    &:active:not(:disabled) {
        transform: translateY(1px);
    }

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
`;

export const InputShell = styled.div`
    height: 40px;
    border-radius: 12px;

    display: flex;
    align-items: center;
    padding: 0 6px 0 12px;

    border: 1px solid rgba(255, 255, 255, 0.12);
    background: rgba(0, 0, 0, 0.25);
    backdrop-filter: blur(10px);
`;

export const Input = styled.input`
    flex: 1;
    border: none;
    outline: none;
    background: transparent;

    color: rgba(255, 255, 255, 0.92);
    font-size: 14px;

    ::placeholder {
        color: rgba(255, 255, 255, 0.5);
    }

    &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }
`;

export const SendButton = styled.button`
    height: 32px;
    width: 36px;

    display: grid;
    place-items: center;

    border: none;
    border-radius: 10px;
    background: transparent;

    color: rgba(255, 255, 255, 0.9);
    cursor: pointer;

    &:hover:not(:disabled) {
        background: rgba(255, 255, 255, 0.08);
    }

    &:active:not(:disabled) {
        transform: translateY(1px);
    }

    &:disabled {
        opacity: 0.35;
        cursor: not-allowed;
    }
`;
