import React from "react";
import Modal from "../../shared/ui/modal/Modal";
import { Button } from "../../shared/ui/button/Button";
import { getInstallInstructionsCopy } from "./installCopy";
import * as M from "../../shared/ui/modal/Modal.styles";
import * as S from "./installPrompt.styles";
import type { InstallCapability } from "../../services/installPromotion";
import { useTranslation } from "react-i18next";

type InstallInstructionsModalProps = {
  capability: InstallCapability;
  isOpen: boolean;
  onClose: () => void;
};

const InstallInstructionsModal: React.FC<InstallInstructionsModalProps> = ({
  capability,
  isOpen,
  onClose,
}) => {
  const { t } = useTranslation();
  const content = getInstallInstructionsCopy(capability, t);

  if (!content) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} ariaLabel={content.title}>
      <M.ModalHeader>
        <div>
          <M.ModalTitle>{content.title}</M.ModalTitle>
          <M.ModalSubtitle>{content.subtitle}</M.ModalSubtitle>
        </div>
        <M.CloseButton type="button" onClick={onClose}>
          {content.closeLabel}
        </M.CloseButton>
      </M.ModalHeader>
      <M.ModalBody>
        <S.ModalIntro>
          <S.ModalBodyText>{t("installPromotion.instructions.sharedNote")}</S.ModalBodyText>
        </S.ModalIntro>
        <S.StepsList>
          {content.steps.map((step, index) => (
            <S.StepItem key={step.id}>
              <S.StepNumber>{index + 1}</S.StepNumber>
              <S.StepContent>
                <S.StepTitle>{step.title}</S.StepTitle>
                <S.StepBody>{step.body}</S.StepBody>
              </S.StepContent>
            </S.StepItem>
          ))}
        </S.StepsList>
      </M.ModalBody>
      <M.ModalFooter>
        <Button type="button" variant="surfaceAccent" onClick={onClose}>
          {content.closeLabel}
        </Button>
      </M.ModalFooter>
    </Modal>
  );
};

export default InstallInstructionsModal;
