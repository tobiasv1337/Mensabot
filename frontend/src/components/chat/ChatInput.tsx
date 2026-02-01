import React, { useCallback, useEffect, useRef, useState } from "react";
import * as S from "./chat.styles";

type ChatInputProps = {
  onSend: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
};

const ChatInput: React.FC<ChatInputProps> = ({ onSend, disabled = false, placeholder = "Nachricht schreiben" }) => {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const resizeTextarea = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, []);

  useEffect(() => {
    resizeTextarea();
  }, [value, resizeTextarea]);

  const submit = useCallback(() => {
    const text = value.trim();
    if (!text || disabled) return;
    onSend(text);
    setValue("");
    requestAnimationFrame(() => textareaRef.current?.focus());
  }, [value, disabled, onSend]);

  return (
    <S.ComposerRow>
      <S.ComposerInputShell>
        <S.ComposerTextarea
          ref={textareaRef}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={placeholder}
          readOnly={disabled}
          aria-disabled={disabled}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              if (disabled) {
                requestAnimationFrame(() => textareaRef.current?.focus());
                return;
              }
              submit();
            }
          }}
        />
        <S.SendButton type="button" aria-label="Senden" onClick={submit} disabled={disabled || !value.trim()}>
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
        </S.SendButton>
      </S.ComposerInputShell>
    </S.ComposerRow>
  );
};

export default ChatInput;
