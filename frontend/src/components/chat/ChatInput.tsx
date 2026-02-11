import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  onTranscribeAudio?: (audio: Blob) => Promise<string>;
  maxVoiceSeconds?: number;
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
  onTranscribeAudio,
  maxVoiceSeconds = 180,
  disabled = false,
  placeholder = "Nachricht schreiben oder mit / Schnellzugriffe nutzen",
  shortcuts,
  onShortcutAdd,
  onShortcutSelect,
  focusSignal,
  commandMenu,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const commandMenuRef = useRef<HTMLDivElement>(null);
  const skipInitialFocus = useRef(true);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const stopTimeoutRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<number | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [voiceSeconds, setVoiceSeconds] = useState(0);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const busy = disabled || isTranscribing;
  const clearVoiceError = useCallback(() => {
    setVoiceError(null);
  }, []);
  const hintText = useMemo(() => {
    if (isRecording) return `Aufnahme läuft... ${voiceSeconds}s / ${maxVoiceSeconds}s`;
    if (isTranscribing) return "Transkription läuft...";
    if (disabled) return "Senden...";
    if (voiceError) return voiceError;
    return placeholder;
  }, [voiceError, isTranscribing, isRecording, voiceSeconds, maxVoiceSeconds, disabled, placeholder]);
  const micState: "idle" | "recording" | "transcribing" = isRecording
    ? "recording"
    : isTranscribing
      ? "transcribing"
      : "idle";
  const focusTextarea = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    try {
      el.focus({ preventScroll: true });
    } catch {
      el.focus();
    }
  }, []);

  const cleanupRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      try {
        recorder.stop();
      } catch {
        // ignore
      }
    }

    mediaRecorderRef.current = null;
    chunksRef.current = [];

    const stream = mediaStreamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    mediaStreamRef.current = null;

    if (stopTimeoutRef.current !== null) {
      window.clearTimeout(stopTimeoutRef.current);
      stopTimeoutRef.current = null;
    }
    if (timerIntervalRef.current !== null) {
      window.clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    setIsRecording(false);
    setVoiceSeconds(0);
  }, []);

  useEffect(() => {
    return () => {
      cleanupRecording();
    };
  }, [cleanupRecording]);

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
    if (busy) return;
    if (!text) return;
    clearVoiceError();
    onSend(text);
    onChange("");
    requestAnimationFrame(() => focusTextarea());
  }, [commandMenu, value, busy, onSend, onChange, focusTextarea, clearVoiceError]);

  const pickRecorderMimeType = useCallback(() => {
    if (typeof MediaRecorder === "undefined") return "";
    const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/ogg"];
    for (const candidate of candidates) {
      if (MediaRecorder.isTypeSupported(candidate)) return candidate;
    }
    return "";
  }, []);

  const transcribeBlob = useCallback(
    async (blob: Blob) => {
      if (!onTranscribeAudio) return;
      setIsTranscribing(true);
      clearVoiceError();
      try {
        const transcript = await onTranscribeAudio(blob);
        const cleaned = (transcript ?? "").trim();
        if (!cleaned) {
          setVoiceError("Keine Sprache erkannt.");
          return;
        }
        onChange(cleaned);
        requestAnimationFrame(() => focusTextarea());
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setVoiceError(message || "Transkription fehlgeschlagen.");
      } finally {
        setIsTranscribing(false);
      }
    },
    [onTranscribeAudio, onChange, focusTextarea, clearVoiceError]
  );

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") {
      cleanupRecording();
      return;
    }
    try {
      recorder.stop();
    } catch {
      cleanupRecording();
    }
  }, [cleanupRecording]);

  const startRecording = useCallback(async () => {
    if (!onTranscribeAudio) return;
    if (disabled || isTranscribing) return;

    clearVoiceError();

    if (!navigator.mediaDevices?.getUserMedia) {
      setVoiceError("Audioaufnahme wird von diesem Browser nicht unterstützt.");
      return;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setVoiceError("Mikrofon-Zugriff verweigert.");
      return;
    }

    const mimeType = pickRecorderMimeType();
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    } catch {
      stream.getTracks().forEach((track) => track.stop());
      setVoiceError("Audioaufnahme konnte nicht gestartet werden.");
      return;
    }

    mediaStreamRef.current = stream;
    mediaRecorderRef.current = recorder;
    chunksRef.current = [];
    setVoiceSeconds(0);
    setIsRecording(true);

    recorder.addEventListener("dataavailable", (event) => {
      if (event.data && event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    });

    recorder.addEventListener("stop", () => {
      const chunks = chunksRef.current;
      const blob = new Blob(chunks, { type: recorder.mimeType || "application/octet-stream" });
      cleanupRecording();
      if (blob.size < 1024) {
        setVoiceError("Aufnahme war zu kurz.");
        return;
      }
      void transcribeBlob(blob);
    });

    try {
      recorder.start(250);
    } catch {
      cleanupRecording();
      setVoiceError("Audioaufnahme konnte nicht gestartet werden.");
      return;
    }

    stopTimeoutRef.current = window.setTimeout(() => {
      stopRecording();
    }, maxVoiceSeconds * 1000);

    timerIntervalRef.current = window.setInterval(() => {
      setVoiceSeconds((prev) => prev + 1);
    }, 1000);
  }, [
    onTranscribeAudio,
    disabled,
    isTranscribing,
    pickRecorderMimeType,
    cleanupRecording,
    transcribeBlob,
    stopRecording,
    maxVoiceSeconds,
    clearVoiceError,
  ]);

  return (
    <S.ComposerRow>
      <S.ComposerInputShell>
        <S.ComposerTopRow>
          <S.ComposerTextarea
            ref={textareaRef}
            value={value}
            onChange={(event) => {
              if (voiceError) clearVoiceError();
              onChange(event.target.value);
            }}
            placeholder={hintText}
            readOnly={busy}
            aria-disabled={busy}
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
                if (busy) {
                  requestAnimationFrame(() => focusTextarea());
                  return;
                }
                submit();
              }
            }}
          />
          {onTranscribeAudio && (
            <S.VoiceButton
              type="button"
              aria-label={isRecording ? "Aufnahme stoppen" : "Sprachnachricht aufnehmen"}
              aria-busy={isTranscribing}
              title={
                isRecording
                  ? `Aufnahme läuft (${voiceSeconds}s) – tippe zum Stoppen`
                  : isTranscribing
                    ? "Transkription läuft..."
                  : "Sprachnachricht aufnehmen"
              }
              onClick={() => {
                if (isRecording) stopRecording();
                else void startRecording();
              }}
              disabled={!isRecording && (disabled || isTranscribing)}
              $state={micState}
            >
              {isRecording ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <rect x="7" y="7" width="10" height="10" rx="2" fill="currentColor" />
                </svg>
              ) : isTranscribing ? (
                <svg
                  className="spin"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" opacity="0.3" />
                  <path
                    d="M20 12a8 8 0 0 0-8-8"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M12 14a3 3 0 0 0 3-3V7a3 3 0 1 0-6 0v4a3 3 0 0 0 3 3Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M19 11a7 7 0 0 1-14 0"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M12 19v3"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M8 22h8"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </S.VoiceButton>
          )}
          <S.SendButton
            type="button"
            aria-label="Senden"
            onClick={submit}
            disabled={busy || !value.trim()}
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
            disabled={busy}
          >
            <span aria-hidden="true">+</span>
          </S.ShortcutAddButton>
          <ScrollablePillRow component={S.ShortcutPillRow}>
            {shortcuts.map((shortcut) => (
              <S.ShortcutPillButton
                key={shortcut.id}
                type="button"
                onClick={() => onShortcutSelect(shortcut)}
                disabled={busy}
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
