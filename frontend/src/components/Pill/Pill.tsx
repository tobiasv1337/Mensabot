import {type ReactNode, useState } from "react";
import "./Pill.css";

type PillProps = {
    type?: "red" | "orange" | "yellow" | string;
    selected?: boolean;               // controlled mode
    initialSelected?: boolean;        // uncontrolled mode default
    disabled?: boolean;

    leftIcon?: ReactNode;
    rightIcon?: ReactNode;
    iconOnly?: boolean;
    children?: ReactNode;

    onClick?: (newState: boolean) => void;
};

export default function Pill({
                                 type = "red",
                                 selected,
                                 initialSelected = false,
                                 disabled = false,
                                 leftIcon = null,
                                 rightIcon = null,
                                 iconOnly = false,
                                 children,
                                 onClick,
                             }: PillProps) {
    const isControlled = selected !== undefined;
    const [internalSelected, setInternalSelected] = useState(initialSelected);
    const currentSelected = isControlled ? selected : internalSelected;

    const handleToggle = () => {
        if (!isControlled) {
            setInternalSelected((prev) => !prev);
        }

        onClick?.(!currentSelected);
    };

    return (
        <button
            disabled={disabled}
            onClick={!disabled ? handleToggle : undefined}
            className={[
                "pill",
                `pill-${type}`,
                currentSelected ? "pill-selected" : "pill-unselected",
                iconOnly ? "pill-icon-only" : "",
            ].join(" ")}
        >
            {leftIcon && <span className="pill-icon left">{leftIcon}</span>}
            {!iconOnly && <span className="pill-text">{children}</span>}
            {rightIcon && <span className="pill-icon right">{rightIcon}</span>}
        </button>
    );
}
