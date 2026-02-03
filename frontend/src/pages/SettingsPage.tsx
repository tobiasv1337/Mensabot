import React, { useState, useEffect, useRef } from "react";
import { Page, Content } from "./PageLayout.styles";
import * as ModalStyles from "../components/shortcuts/shortcuts.styles";
import * as ChatStyles from "../components/chat/chat.styles";
import * as S from "./SettingsPage.styles";

type SettingsPageProps = {
  onDeleteAllChats: () => void;
};

const SettingsPage: React.FC<SettingsPageProps> = ({ onDeleteAllChats }) => {
  const [deleteOpen, setDeleteOpen] = useState(false);

  const handleConfirmDelete = () => {
    setDeleteOpen(false);
    onDeleteAllChats();
  };

  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (deleteOpen) {
      cancelButtonRef.current?.focus();

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          setDeleteOpen(false);
        }
      };

      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [deleteOpen]);

  return (
    <Page>
      <Content>
        <S.HeaderCard>
          <S.HeaderEyebrow>System</S.HeaderEyebrow>
          <S.HeaderTitle>Einstellungen</S.HeaderTitle>
          <S.HeaderSubtitle>
            Verwalte deine App-Einstellungen und gespeicherten Daten.
          </S.HeaderSubtitle>
        </S.HeaderCard>

        <S.SectionCard>
          <S.SectionHeader>
            <S.SectionTitle>Daten & Speicher</S.SectionTitle>
            <S.SectionSubtitle>Verwalte deine lokalen Chatdaten im Browser.</S.SectionSubtitle>
          </S.SectionHeader>
          <S.SectionBody>
            <S.SettingRow $danger>
              <S.SettingInfo>
                <S.SettingLabel>Chat-Verlauf löschen</S.SettingLabel>
                <S.SettingDescription>
                  Entfernt alle gespeicherten Chats dauerhaft aus deinem Browser.
                </S.SettingDescription>
              </S.SettingInfo>
              <S.SettingActions>
                <S.DangerButton type="button" onClick={() => setDeleteOpen(true)}>
                  Alle Chats löschen
                </S.DangerButton>
              </S.SettingActions>
            </S.SettingRow>
            <S.MutedNote>Chats werden lokal im Browser gespeichert.</S.MutedNote>
          </S.SectionBody>
        </S.SectionCard>
      </Content>

      {deleteOpen && (
        <ModalStyles.ModalBackdrop onClick={() => setDeleteOpen(false)}>
          <ModalStyles.ModalCard
            onClick={(event) => event.stopPropagation()}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-modal-title"
            aria-describedby="delete-modal-desc"
          >
            <ModalStyles.ModalHeader>
              <div>
                <ModalStyles.ModalTitle id="delete-modal-title">Alle Chats löschen</ModalStyles.ModalTitle>
                <ModalStyles.ModalSubtitle id="delete-modal-desc">
                  Dadurch werden sämtliche Chat-Verläufe dauerhaft entfernt. Diese Aktion kann nicht rückgängig gemacht werden.
                </ModalStyles.ModalSubtitle>
              </div>
              <ModalStyles.CloseButton type="button" onClick={() => setDeleteOpen(false)}>
                Schließen
              </ModalStyles.CloseButton>
            </ModalStyles.ModalHeader>

            <ModalStyles.ModalBody>
              <ModalStyles.FieldGrid>
                <ModalStyles.FieldLabel>Zu löschende Daten</ModalStyles.FieldLabel>
                <ModalStyles.DeleteName>Alle Chats</ModalStyles.DeleteName>
              </ModalStyles.FieldGrid>
            </ModalStyles.ModalBody>

            <ModalStyles.ModalFooter>
              <ModalStyles.FooterNote>Chats werden lokal im Browser gespeichert.</ModalStyles.FooterNote>
              <ChatStyles.ActionButton
                type="button"
                $variant="secondary"
                onClick={() => setDeleteOpen(false)}
                ref={cancelButtonRef}
              >
                Abbrechen
              </ChatStyles.ActionButton>
              <ChatStyles.ActionButton type="button" $variant="primary" onClick={handleConfirmDelete}>
                Löschen
              </ChatStyles.ActionButton>
            </ModalStyles.ModalFooter>
          </ModalStyles.ModalCard>
        </ModalStyles.ModalBackdrop>
      )}
    </Page>
  );
};

export default SettingsPage;
