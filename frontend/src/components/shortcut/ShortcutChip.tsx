import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import "./shortcuts.css";

interface Props {
    label: string;
    onClick?: () => void;
    onDelete?: () => void;
}

const truncate = (text: string, maxLength = 24) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + "…";
};

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
                y: rect.top - 8, // Abstand nach oben
            });
        }
    }, [showTooltip]);

    return (
        <>
            <div
                className="shortcut-chip"
                ref={chipRef}
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
            >
                <button className="shortcut-label" onClick={onClick}>
                    {short}
                </button>

                <button className="shortcut-delete" onClick={onDelete}>
                    ×
                </button>
            </div>

            {showTooltip &&
                createPortal(
                    <div
                        className="shortcut-tooltip-portal"
                        style={{
                            left: pos.x,
                            top: pos.y,
                        }}
                    >
                        {label}
                    </div>,
                    document.body
                )}
        </>
    );
};
