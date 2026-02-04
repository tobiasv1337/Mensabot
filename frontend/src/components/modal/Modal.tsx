import React from "react";
import * as S from "./modal.styles";

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  ariaLabel?: string;
};

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children, ariaLabel }) => {
  if (!isOpen) return null;

  return (
    <S.ModalBackdrop onClick={onClose}>
      <S.ModalCard
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        tabIndex={-1}
        ref={(node) => node?.focus()}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </S.ModalCard>
    </S.ModalBackdrop>
  );
};

export default Modal;
