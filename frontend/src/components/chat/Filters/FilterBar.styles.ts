import styled from "styled-components";

export const Bar = styled.div`
    flex: 1 1 auto;
    min-width: 0;

    display: grid;
    grid-template-columns: minmax(0, 0.9fr) minmax(0, 0.7fr) minmax(0, 0.7fr);
    gap: 10px;
    align-items: center;
`;

export const Section = styled.div`
    min-width: 0;

    display: grid;
    grid-template-columns: auto 1fr;
    gap: 8px;
    align-items: center;

    padding: 0;            /* ✅ no extra spacing that can force wraps */
    border-left: none;     /* ✅ remove the visible | separators */
`;


export const SectionLabel = styled.div`
    font-size: 12px;
    color: ${({ theme }) => theme.textSecondary};
    line-height: 28px;
    white-space: nowrap;
`;

export const PillsRow = styled.div`
    min-width: 0;

    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
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
    border: 1px solid color-mix(in srgb, ${({ theme }) => theme.textMuted} 26%, transparent);
    background: color-mix(in srgb, ${({ theme }) => theme.surfaceInset} 84%, transparent);

    color: ${({ theme }) => theme.textOnInset};
    font-size: 13px;

    cursor: pointer;

    &:hover:not(:disabled) {
        background: color-mix(in srgb, ${({ theme }) => theme.surfaceInset} 96%, transparent);
    }
`;

export const TogglePill = styled(BasePill)<{ $active?: boolean }>`
    border-color: ${({ theme, $active }) =>
            $active ? theme.accent2 : `color-mix(in srgb, ${theme.textMuted} 26%, transparent)`};

    background: ${({ theme, $active }) =>
            $active
                    ? `color-mix(in srgb, ${theme.accent2} 18%, ${theme.surfaceInset})`
                    : `color-mix(in srgb, ${theme.surfaceInset} 84%, transparent)`};
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

    border: 1px solid color-mix(in srgb, ${({ theme }) => theme.textMuted} 28%, transparent);
    background: color-mix(in srgb, ${({ theme }) => theme.surfaceInset} 78%, transparent);
    color: ${({ theme }) => theme.textOnInset};

    cursor: pointer;
    line-height: 0;

    &:hover {
        background: color-mix(in srgb, ${({ theme }) => theme.surfaceInset} 92%, transparent);
    }
`;
