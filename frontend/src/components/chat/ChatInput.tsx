import React, { useCallback, useEffect, useRef } from "react";
import type { Shortcut } from "../../services/shortcuts";
import ScrollablePillRow from "./ScrollablePillRow";
import * as S from "./chat.styles";

type ChatInputProps = {
  value: string;
  onChange: (value: string) => void;
  onSend: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
  shortcuts: Shortcut[];
  onShortcutAdd: () => void;
  onShortcutSelect: (shortcut: Shortcut) => void;
  focusSignal?: number;
};

const ChatInput: React.FC<ChatInputProps> = ({
  value,
  onChange,
  onSend,
  disabled = false,
  placeholder = "Nachricht schreiben",
  shortcuts,
  onShortcutAdd,
  onShortcutSelect,
  focusSignal,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const skipInitialFocus = useRef(true);
  const focusTextarea = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    try {
      el.focus({ preventScroll: true });
    } catch {
      el.focus();
    }
  }, []);

  const resizeTextarea = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, []);

  useEffect(() => {
    resizeTextarea();
  }, [value, resizeTextarea]);

  useEffect(() => {
    if (focusSignal === undefined) return;
    if (skipInitialFocus.current) {
      skipInitialFocus.current = false;
      return;
    }
    focusTextarea();
  }, [focusSignal, focusTextarea]);

  const submit = useCallback(() => {
    const text = value.trim();
    if (!text || disabled) return;
    onSend(text);
    onChange("");
    requestAnimationFrame(() => focusTextarea());
  }, [value, disabled, onSend, onChange, focusTextarea]);

  return (
    <S.ComposerRow>
      <S.ComposerInputShell>
        <S.ComposerTopRow>
          <S.ComposerTextarea
            ref={textareaRef}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={placeholder}
            readOnly={disabled}
            aria-disabled={disabled}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
              if (disabled) {
                requestAnimationFrame(() => focusTextarea());
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
        </S.ComposerTopRow>
        <S.ShortcutRow>
          <S.ShortcutAddButton
            type="button"
            aria-label="Shortcut hinzufügen"
            onClick={onShortcutAdd}
            disabled={disabled}
          >
            <span aria-hidden="true">+</span>
          </S.ShortcutAddButton>
          <ScrollablePillRow component={S.ShortcutPillRow}>
            {shortcuts.map((shortcut) => (
              <S.ShortcutPillButton
                key={shortcut.id}
                type="button"
                onClick={() => onShortcutSelect(shortcut)}
                disabled={disabled}
              >
                {shortcut.name}
              </S.ShortcutPillButton>
            ))}
          </ScrollablePillRow>
        </S.ShortcutRow>
      </S.ComposerInputShell>
    </S.ComposerRow>
  );
};

export default ChatInput;
