import React, { useCallback, useEffect, useState } from "react";
import type { MensaBotClient } from "../../services/api";
import type { ChatFilters } from "../../services/chats";
import type { ShortcutInput } from "../../services/shortcuts";
import FiltersEditor from "../chat/FiltersEditor";
import { normalizeAllergenList } from "../chat/filterData";
import * as ChatStyles from "../chat/chat.styles";
import * as S from "./shortcuts.styles";

type ShortcutModalProps = {
  isOpen: boolean;
  mode: "create" | "edit";
  initialData: ShortcutInput;
  client: MensaBotClient;
  onSave: (data: ShortcutInput) => void;
  onCancel: () => void;
};

const ShortcutModal: React.FC<ShortcutModalProps> = ({
  isOpen,
  mode,
  initialData,
  client,
  onSave,
  onCancel,
}) => {
  const [name, setName] = useState(initialData.name);
  const [prompt, setPrompt] = useState(initialData.prompt);
  const [filters, setFilters] = useState<ChatFilters>(initialData.filters);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setName(initialData.name);
    setPrompt(initialData.prompt);
    setFilters(initialData.filters);
    setError("");
  }, [isOpen, initialData]);

  const handleSave = useCallback(() => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Bitte gib einen Namen für den Shortcut an.");
      return;
    }
    setError("");
    onSave({
      name: trimmedName,
      prompt,
      filters: {
        ...filters,
        allergens: normalizeAllergenList(filters.allergens),
      },
    });
  }, [name, prompt, filters, onSave]);

  if (!isOpen) return null;

  return (
    <S.ModalBackdrop onClick={onCancel}>
      <S.ModalCard onClick={(event) => event.stopPropagation()}>
        <S.ModalHeader>
          <div>
            <S.ModalTitle>{mode === "create" ? "Neuer Shortcut" : "Shortcut bearbeiten"}</S.ModalTitle>
            <S.ModalSubtitle>
              Name, Prompt und Filter definieren. Der Prompt wird ins Chatfeld eingesetzt.
            </S.ModalSubtitle>
          </div>
          <S.CloseButton type="button" onClick={onCancel}>
            Schließen
          </S.CloseButton>
        </S.ModalHeader>

        <S.ModalBody>
          <S.FieldGrid>
            <S.FieldLabel htmlFor="shortcut-name">Name</S.FieldLabel>
            <S.TextInput
              id="shortcut-name"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                if (error) setError("");
              }}
              placeholder="z. B. Mensa Dienstag"
            />
          </S.FieldGrid>

          <S.FieldGrid>
            <S.FieldLabel htmlFor="shortcut-prompt">Prompt</S.FieldLabel>
            <S.TextArea
              id="shortcut-prompt"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Nachricht, die im Chat eingefügt wird"
            />
          </S.FieldGrid>

          <S.FiltersSection>
            <FiltersEditor filters={filters} onChange={setFilters} client={client} />
          </S.FiltersSection>

          {error && <ChatStyles.InlineError>{error}</ChatStyles.InlineError>}
        </S.ModalBody>

        <S.ModalFooter>
          <S.FooterNote>Shortcuts werden lokal im Browser gespeichert.</S.FooterNote>
          <ChatStyles.ActionButton type="button" $variant="secondary" onClick={onCancel}>
            Abbrechen
          </ChatStyles.ActionButton>
          <ChatStyles.ActionButton type="button" $variant="primary" onClick={handleSave}>
            {mode === "create" ? "Shortcut speichern" : "Änderungen speichern"}
          </ChatStyles.ActionButton>
        </S.ModalFooter>
      </S.ModalCard>
    </S.ModalBackdrop>
  );
};

export default ShortcutModal;
