import React, { useEffect, useRef } from "react";
import * as S from "./modal.styles";

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  ariaLabel?: string;
};

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children, ariaLabel }) => {
  const cardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const node = cardRef.current;
    if (!node) return;
    // Only move focus on open if nothing inside the modal is already focused.
    if (document.activeElement && node.contains(document.activeElement)) return;
    node.focus();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <S.ModalBackdrop onClick={onClose}>
      <S.ModalCard
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        tabIndex={-1}
        ref={cardRef}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </S.ModalCard>
    </S.ModalBackdrop>
  );
};

export default Modal;
