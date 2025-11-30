import "./shortcuts.css";
import { ShortcutChip } from "./ShortcutChip";

interface Props {
    shortcuts: string[];
    onShortcutClick: (s: string) => void;
    onDeleteShortcut: (s: string) => void;
    onAddShortcut: () => void;
}

export const ShortcutList = ({
                                 shortcuts,
                                 onShortcutClick,
                                 onDeleteShortcut,
                                 onAddShortcut,
                             }: Props) => {
    return (
        <div className="shortcut-list">
            <button className="shortcut-add-btn" onClick={onAddShortcut}>
                +
            </button>

            {shortcuts.map((s) => (
                <ShortcutChip
                    key={s}
                    label={s}
                    onClick={() => onShortcutClick(s)}
                    onDelete={() => onDeleteShortcut(s)}
                />
            ))}
        </div>
    );
};
