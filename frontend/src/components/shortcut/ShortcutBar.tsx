import styled from "styled-components";
import { useShortcutStorage } from "../../hooks/useShortcutStorage";
import { ShortcutList } from "./ShortcutList";

interface ShortcutBarProps {
    setUserInput: (v: string) => void;
    userInput: string;
}

const Container = styled.div`
  background: #1f2937;       /* gray-800 */
  border: 1px solid #374151; /* gray-700 */
  border-radius: 0.75rem;    /* rounded-xl */
  padding: 0.75rem;          /* p-3 */
`;

export default function ShortcutBar({ setUserInput, userInput }: ShortcutBarProps) {
    const { shortcuts, addShortcut, removeShortcut } =
        useShortcutStorage("mensabot-shortcuts", []);

    const handleAddShortcut = () => {
        if (!userInput.trim()) return;
        addShortcut(userInput);
        setUserInput("");
    };

    return (
        <Container>
            <ShortcutList
                shortcuts={shortcuts}
                onShortcutClick={(s) => setUserInput(s)}
                onAddShortcut={handleAddShortcut}
                onDeleteShortcut={removeShortcut}
            />
        </Container>
    );
}
