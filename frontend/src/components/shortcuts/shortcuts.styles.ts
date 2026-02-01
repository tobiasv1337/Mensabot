import styled from "styled-components";

export const ModalBackdrop = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(15, 18, 22, 0.58);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  z-index: 2200;
`;

export const ModalCard = styled.div`
  width: min(920px, 100%);
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => theme.surfaceElevated};
  color: ${({ theme }) => theme.textOnElevated};
  border-radius: 20px;
  border: 1px solid ${({ theme }) => `${theme.textMuted}33`};
  box-shadow: 0 30px 60px ${({ theme }) => `${theme.textDark}38`};
  overflow: hidden;
`;

export const ModalHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 22px 24px 0;
`;

export const ModalTitle = styled.h3`
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: ${({ theme }) => theme.textOnElevated};
`;

export const ModalSubtitle = styled.p`
  margin: 6px 0 0;
  font-size: 13px;
  color: ${({ theme }) => theme.textSecondary};
`;

export const CloseButton = styled.button`
  border: 1px solid ${({ theme }) => `${theme.textMuted}44`};
  background: transparent;
  color: ${({ theme }) => theme.textOnElevated};
  border-radius: 12px;
  height: 36px;
  padding: 0 12px;
  cursor: pointer;
  font-weight: 600;

  &:hover {
    background: ${({ theme }) => theme.surfaceInset};
  }
`;

export const ModalBody = styled.div`
  padding: 18px 24px 20px;
  display: grid;
  gap: 16px;
  overflow-y: auto;
`;

export const FieldGrid = styled.div`
  display: grid;
  gap: 10px;
`;

export const FieldLabel = styled.label`
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.textSecondary};
`;

export const TextInput = styled.input`
  height: 42px;
  padding: 0 12px;
  border-radius: 12px;
  border: 1px solid ${({ theme }) => `${theme.textMuted}44`};
  background: ${({ theme }) => theme.surfaceInset};
  color: ${({ theme }) => theme.textOnInset};
  font-size: 14px;
  font-family: inherit;

  &:focus {
    outline: 2px solid ${({ theme }) => theme.accent2};
    outline-offset: 1px;
  }
`;

export const TextArea = styled.textarea`
  min-height: 100px;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid ${({ theme }) => `${theme.textMuted}44`};
  background: ${({ theme }) => theme.surfaceInset};
  color: ${({ theme }) => theme.textOnInset};
  font-size: 14px;
  line-height: 1.5;
  resize: vertical;
  font-family: inherit;

  &:focus {
    outline: 2px solid ${({ theme }) => theme.accent2};
    outline-offset: 1px;
  }
`;

export const FiltersSection = styled.div`
  display: grid;
  gap: 14px;
  padding: 14px;
  border-radius: 14px;
  border: 1px solid ${({ theme }) => `${theme.textMuted}26`};
  background: ${({ theme }) => theme.surfacePage};
`;

export const ModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 0 24px 22px;
`;

export const FooterNote = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.textSecondary};
  margin-right: auto;
`;
