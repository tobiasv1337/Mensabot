import { useState, useRef, useEffect } from "react";
import styled from "styled-components";
import { TooltipPortal } from "./TooltipPortal";

interface Props {
    label: string;
    onClick?: () => void;
    onDelete?: () => void;
}

const truncate = (text: string, maxLength = 24) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + "…";
};

const Chip = styled.div`
    display: flex;
    align-items: center;

    background: #3b3f45;
    height: 35px;
    padding: 0 14px;

    border-radius: 20px;
    gap: 10px;

    flex-shrink: 0;
    position: relative;
`;

const LabelButton = styled.button`
    background: transparent;
    border: none;

    font-size: 15px;
    color: white;

    cursor: pointer;
    padding: 0;
    margin: 0;
`;

const DeleteButton = styled.button`
    background: transparent;
    border: none;
    color: #cfcfcf;

    font-size: 16px;
    cursor: pointer;

    padding: 0;
    margin: 0;

    display: flex;
    align-items: center;

    &:hover {
        color: #ff7373;
    }
`;

const Tooltip = styled.div`
    position: fixed;
    transform: translate(-50%, -100%);

    background: #1f1f1f;
    color: white;

    padding: 8px 12px;
    border-radius: 6px;

    white-space: normal;
    word-wrap: break-word;
    max-width: 300px;

    font-size: 13px;
    line-height: 1.4;

    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);

    z-index: 999999;
    pointer-events: none;
`;

export const ShortcutChip = ({ label, onClick, onDelete }: Props) => {
    const short = truncate(label, 10);

    const [showTooltip, setShowTooltip] = useState(false);
    const [pos, setPos] = useState({ x: 0, y: 0 });
    const chipRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (showTooltip && chipRef.current) {
            const rect = chipRef.current.getBoundingClientRect();
            setPos({
                x: rect.left + rect.width / 2,
                y: rect.top - 8,
            });
        }
    }, [showTooltip]);

    return (
        <>
            <Chip
                ref={chipRef}
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
            >
                <LabelButton onClick={onClick}>{short}</LabelButton>
                <DeleteButton onClick={onDelete}>×</DeleteButton>
            </Chip>

            {showTooltip && (
                <TooltipPortal>
                    <Tooltip style={{ left: pos.x, top: pos.y }}>{label}</Tooltip>
                </TooltipPortal>
            )}
        </>
    );
};
