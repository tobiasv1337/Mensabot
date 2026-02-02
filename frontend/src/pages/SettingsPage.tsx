import React, { useState, useEffect, useRef } from "react";
import { Page, Content } from "./PageLayout.styles";
import ConfirmModal from "../components/modal/ConfirmModal";
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
        <ConfirmModal
          isOpen={deleteOpen}
          title="Alle Chats löschen"
          subtitle="Dadurch werden sämtliche Chat-Verläufe dauerhaft entfernt. Diese Aktion kann nicht rückgängig gemacht werden."
          summary={{ label: "Zu löschende Daten", value: "Alle Chats" }}
          note="Chats werden lokal im Browser gespeichert."
          confirmLabel="Löschen"
          cancelLabel="Abbrechen"
          onCancel={() => setDeleteOpen(false)}
          onConfirm={handleConfirmDelete}
        />
      )}
    </Page>
  );
};

export default SettingsPage;
