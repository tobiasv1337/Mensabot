import React, { useCallback, useState, useEffect } from "react";
import type { MensaBotClient } from "../../services/api";
import type { ChatFilters } from "../../services/chats";
import type { ShortcutInput } from "../../services/shortcuts";
import FiltersEditor from "../chat/FiltersEditor";
import { normalizeAllergenList } from "../chat/filterData";
import * as ChatStyles from "../chat/chat.styles";
import Modal from "../modal/Modal";
import * as S from "../modal/modal.styles";

type ShortcutModalProps = {
  isOpen: boolean;
  mode: "create" | "edit";
  value: ShortcutInput;
  onChange: (next: ShortcutInput) => void;
  client: MensaBotClient;
  onSave: (data: ShortcutInput) => void;
  onCancel: () => void;
};

const ShortcutModal: React.FC<ShortcutModalProps> = ({
  isOpen,
  mode,
  value,
  onChange,
  client,
  onSave,
  onCancel,
}) => {
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const handleSave = useCallback(() => {
    const trimmedName = value.name.trim();
    if (!trimmedName) {
      setHasSubmitted(true);
      return;
    }
    setHasSubmitted(false);
    onSave({
      name: trimmedName,
      prompt: value.prompt,
      filters: {
        ...value.filters,
        allergens: normalizeAllergenList(value.filters.allergens),
      },
    });
  }, [value, onSave]);

  const handleCancel = useCallback(() => {
    setHasSubmitted(false);
    onCancel();
  }, [onCancel]);

  const clearSubmitted = useCallback(() => {
    if (hasSubmitted) setHasSubmitted(false);
  }, [hasSubmitted]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onCancel]);

  if (!isOpen) return null;
  const nameError = hasSubmitted ? "Bitte gib einen Namen für den Shortcut an." : "";

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      ariaLabel={mode === "create" ? "Neuer Shortcut" : "Shortcut bearbeiten"}
    >
      <S.ModalHeader>
        <div>
          <S.ModalTitle>{mode === "create" ? "Neuer Shortcut" : "Shortcut bearbeiten"}</S.ModalTitle>
          <S.ModalSubtitle>
            Name, Prompt und Filter definieren. Der Prompt wird ins Chatfeld eingesetzt.
          </S.ModalSubtitle>
        </div>
        <S.CloseButton type="button" onClick={handleCancel}>
          Schließen
        </S.CloseButton>
      </S.ModalHeader>

      <S.ModalBody>
        <S.FieldGrid>
          <S.FieldLabel htmlFor="shortcut-name">Name</S.FieldLabel>
          <S.TextInput
            id="shortcut-name"
            value={value.name}
            onChange={(event) => {
              clearSubmitted();
              onChange({
                ...value,
                name: event.target.value,
              });
            }}
            placeholder="z. B. Mensa Dienstag"
          />
        </S.FieldGrid>

        <S.FieldGrid>
          <S.FieldLabel htmlFor="shortcut-prompt">Prompt</S.FieldLabel>
          <S.TextArea
            id="shortcut-prompt"
            value={value.prompt}
            onChange={(event) => {
              clearSubmitted();
              onChange({
                ...value,
                prompt: event.target.value,
              });
            }}
            placeholder="Nachricht, die im Chat eingefügt wird"
          />
        </S.FieldGrid>

        <S.FiltersSection>
          <FiltersEditor
            filters={value.filters}
            onChange={(nextFilters: ChatFilters) => {
              clearSubmitted();
              onChange({
                ...value,
                filters: nextFilters,
              });
            }}
            client={client}
          />
        </S.FiltersSection>

        {nameError && <ChatStyles.InlineError>{nameError}</ChatStyles.InlineError>}
      </S.ModalBody>

      <S.ModalFooter>
        <S.FooterNote>Shortcuts werden lokal im Browser gespeichert.</S.FooterNote>
        <ChatStyles.ActionButton type="button" $variant="secondary" onClick={handleCancel}>
          Abbrechen
        </ChatStyles.ActionButton>
        <ChatStyles.ActionButton type="button" $variant="primary" onClick={handleSave}>
          {mode === "create" ? "Shortcut speichern" : "Änderungen speichern"}
        </ChatStyles.ActionButton>
      </S.ModalFooter>
    </Modal>
  );
};

export default ShortcutModal;
