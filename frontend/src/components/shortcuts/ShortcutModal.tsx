import React, { useCallback, useState, useEffect } from "react";
import type { MensaBotClient } from "../../services/api";
import type { ChatFilters } from "../../services/chats";
import type { ShortcutInput } from "../../services/shortcuts";
import FiltersEditor from "../chat/FiltersEditor";
import { normalizeAllergenList } from "../chat/filterData";
import * as ChatStyles from "../chat/chat.styles";
import Modal from "../modal/Modal";
import * as S from "../modal/modal.styles";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
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
  const nameError = hasSubmitted ? t('shortcutModal.nameError') : "";

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      ariaLabel={mode === "create" ? t('shortcutModal.createTitle') : t('shortcutModal.editTitle')}
    >
      <S.ModalHeader>
        <div>
          <S.ModalTitle>{mode === "create" ? t('shortcutModal.createTitle') : t('shortcutModal.editTitle')}</S.ModalTitle>
          <S.ModalSubtitle>
            {t('shortcutModal.description')}
          </S.ModalSubtitle>
        </div>
        <S.CloseButton type="button" onClick={handleCancel}>
          {t('shortcutModal.close')}
        </S.CloseButton>
      </S.ModalHeader>

      <S.ModalBody>
        <S.FieldGrid>
          <S.FieldLabel htmlFor="shortcut-name">{t('shortcutModal.name')}</S.FieldLabel>
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
            placeholder={t('shortcutModal.namePlaceholder')}
            autoFocus
          />
        </S.FieldGrid>

        <S.FieldGrid>
          <S.FieldLabel htmlFor="shortcut-prompt">{t('shortcutModal.prompt')}</S.FieldLabel>
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
            placeholder={t('shortcutModal.promptPlaceholder')}
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
        <S.FooterNote>{t('shortcutModal.footerNote')}</S.FooterNote>
        <ChatStyles.ActionButton type="button" $variant="secondary" onClick={handleCancel}>
          {t('shortcutModal.cancel')}
        </ChatStyles.ActionButton>
        <ChatStyles.ActionButton type="button" $variant="primary" onClick={handleSave}>
          {mode === "create" ? t('shortcutModal.saveCreate') : t('shortcutModal.saveEdit')}
        </ChatStyles.ActionButton>
      </S.ModalFooter>
    </Modal>
  );
};

export default ShortcutModal;
