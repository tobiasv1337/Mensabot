import React, { useState, useEffect, useRef } from "react";
import { Page, Content } from "./PageLayout.styles";
import ConfirmModal from "../components/modal/ConfirmModal";
import * as S from "./SettingsPage.styles";
import { Button } from "../components/button/button";
import { useTranslation } from "react-i18next";

type SettingsPageProps = {
  onDeleteAllChats: () => void;
};

const SettingsPage: React.FC<SettingsPageProps> = ({ onDeleteAllChats }) => {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const { t, i18n } = useTranslation();

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
          <S.HeaderEyebrow>{t('settings.header.eyebrow')}</S.HeaderEyebrow>
          <S.HeaderTitle>{t('settings.header.title')}</S.HeaderTitle>
          <S.HeaderSubtitle>
            {t('settings.header.subtitle')}
          </S.HeaderSubtitle>
        </S.HeaderCard>

        <S.SectionCard>
          <S.SectionHeader>
            <S.SectionTitle>{t('settings.data.title')}</S.SectionTitle>
            <S.SectionSubtitle>{t('settings.data.subtitle')}</S.SectionSubtitle>
          </S.SectionHeader>
          <S.SectionBody>
            <S.SettingRow $danger>
              <S.SettingInfo>
                <S.SettingLabel>{t('settings.data.deleteChats.label')}</S.SettingLabel>
                <S.SettingDescription>
                  {t('settings.data.deleteChats.description')}
                </S.SettingDescription>
              </S.SettingInfo>
              <S.SettingActions>
                <S.DangerButton type="button" onClick={() => setDeleteOpen(true)}>
                  {t('settings.data.deleteChats.button')}
                </S.DangerButton>
              </S.SettingActions>
            </S.SettingRow>
            <S.MutedNote>{t('settings.data.deleteChats.note')}</S.MutedNote>
          </S.SectionBody>
        </S.SectionCard>

        <S.SectionCard>
          <S.SectionHeader>
            <S.SectionTitle>{t('settings.language.title')}</S.SectionTitle>
          </S.SectionHeader>
          <S.SectionBody>
            <S.SettingRow $default>
              <S.SettingInfo>
                <S.SettingLabel>{t('settings.language.label')}</S.SettingLabel>
              </S.SettingInfo>
              <S.SettingActions>
                <Button
                  type="button"
                  variant={i18n.language === 'de' ? "surfaceAccent" : "default"}
                  onClick={() => i18n.changeLanguage('de')}
                >
                  {t('settings.language.de')}
                </Button>
                <Button
                  type="button"
                  variant={i18n.language === 'en' ? "surfaceAccent" : "default"}
                  onClick={() => i18n.changeLanguage('en')}
                >
                  {t('settings.language.en')}
                </Button>
              </S.SettingActions>
            </S.SettingRow>
          </S.SectionBody>
        </S.SectionCard>
      </Content>

      {deleteOpen && (
        <ConfirmModal
          isOpen={deleteOpen}
          title={t('settings.modal.title')}
          subtitle={t('settings.modal.subtitle')}
          summary={{ label: t('settings.modal.summaryLabel'), value: t('settings.modal.summaryValue') }}
          note={t('settings.modal.note')}
          confirmLabel={t('settings.modal.confirm')}
          cancelLabel={t('settings.modal.cancel')}
          onCancel={() => setDeleteOpen(false)}
          onConfirm={handleConfirmDelete}
          cancelButtonRef={cancelButtonRef}
        />
      )}
    </Page>
  );
};

export default SettingsPage;
