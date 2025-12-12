import styled from "styled-components";
import { ShortcutChip } from "./ShortcutChip";

interface Props {
    shortcuts: string[];
    onShortcutClick: (s: string) => void;
    onDeleteShortcut: (s: string) => void;
    onAddShortcut: () => void;
}

const List = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;

    overflow-x: auto;
    overflow-y: visible;

    padding: 8px 0;
    position: relative;
`;

const AddButton = styled.button`
    width: 35px;
    height: 35px;

    background: #3b3f45;
    color: white;
    border: none;

    border-radius: 50%;
    display: flex;
    justify-content: center;
    align-items: center;

    font-size: 15px;
    cursor: pointer;

    flex-shrink: 0;

    &:hover {
        background: #555;
    }
`;

export const ShortcutList = ({
                                 shortcuts,
                                 onShortcutClick,
                                 onDeleteShortcut,
                                 onAddShortcut,
                             }: Props) => {
    return (
        <List>
            <AddButton onClick={onAddShortcut}>+</AddButton>

            {shortcuts.map((s) => (
                <ShortcutChip
                    key={s}
                    label={s}
                    onClick={() => onShortcutClick(s)}
                    onDelete={() => onDeleteShortcut(s)}
                />
            ))}
        </List>
    );
};
