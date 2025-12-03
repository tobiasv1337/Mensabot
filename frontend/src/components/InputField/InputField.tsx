import React, { useState } from "react";
import Pill from "./Pill.tsx";
import "./InputField.css";

export default function InputField() {
    const [inputValue, setInputValue] = useState("");
    const [shortcuts, setShortcuts] = useState([
        { id: 1, label: "Shortcut 1", selected: false },
        { id: 2, label: "Shortcut 2", selected: false },
    ]);

    const addShortcut = () => {
        const newId = Date.now();
        setShortcuts([
            ...shortcuts,
            { id: newId, label: `Shortcut ${shortcuts.length + 1}`, selected: false },
        ]);
    };

    const toggleShortcut = (id: number) => {
        setShortcuts(prev =>
            prev.map(s =>
                s.id === id ? { ...s, selected: !s.selected } : s
            )
        );
    };


    const removeShortcut = (id: number) => {
        setShortcuts(shortcuts.filter((s) => s.id !== id));
    };

    const handleSend = () => {
        if (!inputValue.trim()) return;
        console.log("Sending:", inputValue);
        setInputValue("");
    };

    return (
        <div className="inputfeld-container">
            {/* INPUT SECTION */}
            <div className="inputfeld-inner">
                <input
                    className="mensabot-input"
                    placeholder="inputfeld"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                />

                <button className="send-btn" onClick={handleSend}>
                    ✈
                </button>
            </div>

            {/* SHORTCUTS ROW */}
            <div className="pills-row">
                <Pill
                    type="dark" // Changed to 'dark' for better styling control
                    iconOnly
                    leftIcon="+"
                    onClick={addShortcut}
                />

                {shortcuts.map((s) => (
                    <Pill
                        key={s.id}
                        type="dark" // Changed to 'dark'
                        initialSelected={s.selected} // Use initialSelected to sync with state
                        onClick={() => toggleShortcut(s.id)}
                        rightIcon={
                            <span
                                onClick={(e) => {
                                    e.stopPropagation(); // Prevents Pill from toggling selection
                                    removeShortcut(s.id);
                                }}
                            >
                                ✕
                            </span>
                        }
                    >
                        {s.label}
                    </Pill>
                ))}
            </div>
        </div>
    );
}