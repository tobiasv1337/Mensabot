import React from "react";
import Modal from "./Modal";
import * as S from "./Modal.styles";
import * as Actions from "./ModalAction.styles";

type ConfirmModalProps = {
  isOpen: boolean;
  title: string;
  subtitle?: string;
  summary?: {
    label: string;
    value: string;
  };
  note?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmDisabled?: boolean;
  cancelDisabled?: boolean;
  cancelButtonRef?: React.RefObject<HTMLButtonElement | null>;
  onConfirm: () => void;
  onCancel: () => void;
};

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  subtitle,
  summary,
  note,
  confirmLabel = "Bestätigen",
  cancelLabel = "Abbrechen",
  confirmDisabled = false,
  cancelDisabled = false,
  cancelButtonRef,
  onConfirm,
  onCancel,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} ariaLabel={title}>
      <S.ModalHeader>
        <div>
          <S.ModalTitle>{title}</S.ModalTitle>
          {subtitle && <S.ModalSubtitle>{subtitle}</S.ModalSubtitle>}
        </div>
        <S.CloseButton type="button" onClick={onCancel}>
          Schließen
        </S.CloseButton>
      </S.ModalHeader>

      {summary && (
        <S.ModalBody>
          <S.FieldGrid>
            <S.FieldLabel>{summary.label}</S.FieldLabel>
            <S.DeleteName>{summary.value}</S.DeleteName>
          </S.FieldGrid>
        </S.ModalBody>
      )}

      <S.ModalFooter>
        {note && <S.FooterNote>{note}</S.FooterNote>}
        <Actions.ActionButton
          type="button"
          $variant="secondary"
          onClick={onCancel}
          disabled={cancelDisabled}
          ref={cancelButtonRef}
        >
          {cancelLabel}
        </Actions.ActionButton>
        <Actions.ActionButton
          type="button"
          $variant="primary"
          onClick={onConfirm}
          disabled={confirmDisabled}
        >
          {confirmLabel}
        </Actions.ActionButton>
      </S.ModalFooter>
    </Modal>
  );
};

export default ConfirmModal;
