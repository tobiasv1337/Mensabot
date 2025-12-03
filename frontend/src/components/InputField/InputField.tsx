import { useState } from "react";
import "./InputField.css";
import Pill from "../Pill/Pill";

type Shortcut = {
    id: number;
    label: string;
    selected: boolean;
};

export default function InputField() {
    const [inputValue, setInputValue] = useState("");
    const [shortcuts, setShortcuts] = useState<Shortcut[]>([
        { id: 1, label: "Shortcut 1", selected: false },
        { id: 2, label: "Shortcut 2", selected: false },
    ]);

    const addShortcut = () => {
        const newId = Date.now();
        setShortcuts((prev) => [
            ...prev,
            { id: newId, label: `Shortcut ${prev.length + 1}`, selected: false },
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
        setShortcuts(prev => prev.filter(s => s.id !== id));
    };

    const handleSend = () => {
        if (!inputValue.trim()) return;
        console.log("Sending:", inputValue);
        setInputValue("");
    };

    return (
        <div className="inputfeld-container">
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

            <div className="pills-row">
                <Pill
                    type="dark"
                    iconOnly
                    leftIcon="+"
                    onClick={addShortcut}
                />

                {shortcuts.map((s) => (
                    <Pill
                        key={s.id}
                        type="dark"
                        selected={s.selected}      // controlled mode (richtig!)
                        onClick={() => toggleShortcut(s.id)}
                        rightIcon={
                            <span
                                onClick={(e) => {
                                    e.stopPropagation();
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
