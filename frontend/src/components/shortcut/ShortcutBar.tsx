import { useShortcutStorage } from "../../hooks/useShortcutStorage";
import { ShortcutList } from "./ShortcutList";

interface ShortcutBarProps {
    setUserInput: (v: string) => void;
    userInput: string; // <-- NEW
}

export default function ShortcutBar({ setUserInput, userInput }: ShortcutBarProps) {
    const { shortcuts, addShortcut, removeShortcut } =
        useShortcutStorage("mensabot-shortcuts", []);

    const handleAddShortcut = () => {
        if (!userInput.trim()) return; // ignore if input empty
        addShortcut(userInput);
        setUserInput("");
    };

    return (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-3">
            <ShortcutList
                shortcuts={shortcuts}
                onShortcutClick={(s) => setUserInput(s)}
                onAddShortcut={handleAddShortcut}
                onDeleteShortcut={removeShortcut}
            />
        </div>
    );
}
