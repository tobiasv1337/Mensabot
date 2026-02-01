import React, { useCallback, useEffect, useRef } from "react";
import type { Shortcut } from "../../services/shortcuts";
import ScrollablePillRow from "./ScrollablePillRow";
import * as S from "./chat.styles";

export type CommandMenuItem = {
  id: string;
  label: string;
  meta?: string;
  kind: "shortcut" | "canteen" | "date";
  payload?: unknown;
};

export type CommandMenuGroup = {
  id: string;
  label: string;
  items: CommandMenuItem[];
  emptyLabel?: string;
};

type CommandMenuState = {
  open: boolean;
  groups: CommandMenuGroup[];
  activeId?: string;
  activeItem?: CommandMenuItem;
  onSelect: (item: CommandMenuItem) => void;
  onNavigate: (direction: "next" | "prev") => void;
  onClose: () => void;
  captureEnter?: boolean;
};

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
  commandMenu?: CommandMenuState;
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
  commandMenu,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const commandMenuRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    if (!commandMenu?.open || !commandMenu.activeId) return;
    const menu = commandMenuRef.current;
    if (!menu) return;
    const activeEl = menu.querySelector(`[data-command-id="${commandMenu.activeId}"]`);
    if (activeEl instanceof HTMLElement) {
      activeEl.scrollIntoView({ block: "nearest" });
    }
  }, [commandMenu?.activeId, commandMenu?.open]);

  const submit = useCallback(() => {
    if (commandMenu?.open && commandMenu.captureEnter !== false) {
      if (commandMenu.activeItem) {
        commandMenu.onSelect(commandMenu.activeItem);
      }
      return;
    }
    const text = value.trim();
    if (disabled) return;
    if (!text) return;
    onSend(value);
    onChange("");
    requestAnimationFrame(() => focusTextarea());
  }, [commandMenu, value, disabled, onSend, onChange, focusTextarea]);

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
              if (commandMenu?.open) {
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  commandMenu.onNavigate("next");
                  return;
                }
                if (event.key === "ArrowUp") {
                  event.preventDefault();
                  commandMenu.onNavigate("prev");
                  return;
                }
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  if (commandMenu.captureEnter !== false && commandMenu.activeItem) {
                    commandMenu.onSelect(commandMenu.activeItem);
                    return;
                  }
                  submit();
                  return;
                }
                if (event.key === "Escape") {
                  event.preventDefault();
                  commandMenu.onClose();
                  return;
                }
              }

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
          <S.SendButton
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
          </S.SendButton>
        </S.ComposerTopRow>
        {commandMenu?.open && (
          <S.CommandMenu ref={commandMenuRef} role="listbox" aria-label="Slash Commands">
            {commandMenu.groups.map((group) => (
              <S.CommandGroup key={group.id}>
                <S.CommandGroupTitle>{group.label}</S.CommandGroupTitle>
                {group.items.length > 0 ? (
                  group.items.map((item) => (
                    <S.CommandItem
                      key={item.id}
                      type="button"
                      $active={item.id === commandMenu.activeId}
                      data-command-id={item.id}
                      role="option"
                      aria-selected={item.id === commandMenu.activeId}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => commandMenu.onSelect(item)}
                    >
                      <div>
                        <S.CommandLabel>{item.label}</S.CommandLabel>
                        {item.meta && <S.CommandMeta>{item.meta}</S.CommandMeta>}
                      </div>
                      <S.CommandBadge>
                        {item.kind === "shortcut" ? "Shortcut" : item.kind === "date" ? "Datum" : "Mensa"}
                      </S.CommandBadge>
                    </S.CommandItem>
                  ))
                ) : (
                  <S.CommandEmpty>{group.emptyLabel ?? "Keine Treffer"}</S.CommandEmpty>
                )}
              </S.CommandGroup>
            ))}
          </S.CommandMenu>
        )}
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
