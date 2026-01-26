import styled from "styled-components";

export const Bar = styled.div`
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 8px 10px;
    border-radius: 14px;

    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.10);

    width: fit-content;
    max-width: 100%;
    overflow-x: auto;
    white-space: nowrap;
`;

export const Section = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 0 0 auto;
`;

export const SectionLabel = styled.div`
    font-size: 12px;
    color: rgba(255, 255, 255, 0.7);
    margin-right: 2px;
`;

export const PillsRow = styled.div`
    display: flex;
    gap: 8px;
    align-items: center;
    flex: 0 0 auto;
`;

export const PillText = styled.span`
    display: inline-block;
    max-width: 180px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

const BasePill = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 8px;

    height: 28px;
    padding: 0 10px;

    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    background: rgba(255, 255, 255, 0.08);
    color: rgba(255, 255, 255, 0.9);
    font-size: 13px;

    cursor: pointer;

    &:hover:not(:disabled) {
        background: rgba(255, 255, 255, 0.12);
    }
`;

export const TogglePill = styled(BasePill)<{ $active?: boolean }>`
    background: ${(p) =>
            p.$active ? "rgba(255, 255, 255, 0.16)" : "rgba(255, 255, 255, 0.08)"};
`;

export const TagPill = styled(BasePill)`
    padding-right: 8px;
`;

export const AddPill = styled(BasePill)`
    width: 28px;
    padding: 0;
    justify-content: center;
`;

export const RemoveButton = styled.button`
    width: 20px;
    height: 20px;
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    background: rgba(0, 0, 0, 0.25);
    color: rgba(255, 255, 255, 0.85);
    cursor: pointer;
    line-height: 0;

    &:hover {
        background: rgba(0, 0, 0, 0.35);
    }
`;
