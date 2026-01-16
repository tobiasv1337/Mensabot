import React, { useCallback, useState } from "react";
import Shortcuts from "../Shortcuts/Shortcuts";
import { useShortcutStorage } from "../hooks/useShortcutStorage";
import {
    Wrapper,
    Grid,
    PlusButton,
    InputShell,
    Input,
    SendButton,
} from "./ChatComposer.styles";

type ChatComposerProps = {
    onSend?: (text: string) => void;
    placeholder?: string;
    disabled?: boolean;
};

const ChatComposer: React.FC<ChatComposerProps> = ({
                                                       onSend,
                                                       placeholder = "Eingabefeld",
                                                       disabled = false,
                                                   }) => {
    const [value, setValue] = useState("");

    const { shortcuts, addShortcut, removeShortcut } = useShortcutStorage("mensabot-shortcuts");

    const submit = useCallback(() => {
        const text = value.trim();
        if (!text || disabled) return;
        onSend?.(text);
        setValue("");
    }, [value, disabled, onSend]);

    const onAddShortcut = useCallback(() => {
        if (disabled) return;
        if (!value.trim()) return;

        addShortcut(value);  // store full text
        setValue("");        // IMPORTANT: same as old behavior :contentReference[oaicite:1]{index=1}
    }, [addShortcut, value, disabled]);

    const onShortcutSelect = useCallback((text: string) => {
        setValue(text); // fill input with full stored shortcut
    }, []);

    return (
        <Wrapper>
            <Grid>
                <PlusButton
                    type="button"
                    aria-label="Shortcut speichern"
                    disabled={disabled || !value.trim()}
                    onClick={onAddShortcut}
                >
                    +
                </PlusButton>

                <InputShell>
                    <Input
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        placeholder={placeholder}
                        disabled={disabled}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                e.preventDefault();
                                submit();
                            }
                        }}
                    />

                    <SendButton
                        type="button"
                        aria-label="Senden"
                        onClick={submit}
                        disabled={disabled || !value.trim()}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                            <path
                                d="M22 2L11 13"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                            <path
                                d="M22 2L15 22L11 13L2 9L22 2Z"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </SendButton>
                </InputShell>

                <Shortcuts items={shortcuts} onSelect={onShortcutSelect} onDelete={removeShortcut} />
            </Grid>
        </Wrapper>
    );
};

export default ChatComposer;
