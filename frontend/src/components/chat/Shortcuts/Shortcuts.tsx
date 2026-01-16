import React from "react";
import { Row, Pill, DeleteButton } from "./Shortcuts.styles";

type ShortcutsProps = {
    items: string[];
    onSelect: (value: string) => void;
    onDelete: (value: string) => void;
};

const truncate = (text: string, maxLength = 10) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + "…";
};

const Shortcuts: React.FC<ShortcutsProps> = ({
                                                 items,
                                                 onSelect,
                                                 onDelete,
                                             }) => {
    return (
        <Row aria-label="Shortcuts">
            {items.map((full) => (
                <Pill
                    key={full}
                    type="button"
                    onClick={() => onSelect(full)}
                    title={full}
                >
                    {truncate(full, 10)}

                    {/* delete shortcut */}
                    <DeleteButton
                        type="button"
                        aria-label="Shortcut löschen"
                        onClick={(e) => {
                            e.stopPropagation(); // IMPORTANT
                            onDelete(full);
                        }}
                    >
                        –
                    </DeleteButton>
                </Pill>
            ))}
        </Row>
    );
};

export default Shortcuts;
