import React from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from "styled-components";
import * as S from './LegalNoticePage.styles';
import * as P from '@/shared/ui/page/PageHero.styles';
import { Button } from '@/shared/ui/button/Button';
import { MailIcon } from "@/shared/ui/icons";
import { GitHubLogoBlack, GitHubLogoWhite, TuLogo, QualityAndUsabilityLogo } from "@/shared/ui/iconsLogos";

const LegalNoticePage: React.FC = () => {
    const { t } = useTranslation();
    const theme = useTheme();
    const GitHubLogo = theme.mode === 'dark' ? GitHubLogoBlack : GitHubLogoWhite;

    return (
        <S.PageContainer>
            <S.ScreenWrapper>
                <P.HeroCard>
                    <P.HeroEyebrow>{t('contact.eyebrow')}</P.HeroEyebrow>
                    <P.HeroTitle>{t('contact.title')}</P.HeroTitle>
                </P.HeroCard>

                <S.UpperSection>
                    <S.LogosContainer>
                        <TuLogo />
                        <QualityAndUsabilityLogo />
                    </S.LogosContainer>
                    <S.Description>
                        {t('contact.description')}
                    </S.Description>
                    <S.ButtonContainer>
                        <Button
                            variant="accent1"
                            iconLeft={<GitHubLogo />}
                            text={t('contact.issueButton')}
                            onClick={() => { window.open('https://github.com/tobiasv1337/Mensabot/issues', '_blank'); }}
                        />
                        <Button
                            variant="accent1"
                            iconLeft={<MailIcon />}
                            text={t('contact.mailButton')}
                            onClick={() => { window.location.href = `mailto:${t('contact.mail')}`; }}
                        />
                    </S.ButtonContainer>


                </S.UpperSection>

                <S.ImpressumContainer>
                    <S.ImpressumTitle>{t('contact.impressum.title')}</S.ImpressumTitle>
                    <S.ImpressumContentWrapper>
                        <S.ImpressumSection>
                            <S.ImpressumSectionTitle>{t('contact.impressum.contact.title')}</S.ImpressumSectionTitle>
                            <S.ImpressumText>{t('contact.impressum.contact.name')}</S.ImpressumText>
                            <S.ImpressumText>{t('contact.impressum.contact.address')}</S.ImpressumText>
                            <S.ImpressumText>{t('contact.impressum.contact.street')}</S.ImpressumText>
                            <S.ImpressumText>{t('contact.impressum.contact.postalCode')} {t('contact.impressum.contact.city')}</S.ImpressumText>
                            <S.ImpressumText>{t('contact.impressum.contact.email')}</S.ImpressumText>
                        </S.ImpressumSection>

                        <S.ImpressumSection>
                            <S.ImpressumSectionTitle>{t('contact.impressum.legal.title')}</S.ImpressumSectionTitle>
                            <S.ImpressumText>{t('contact.impressum.legal.copyright')}</S.ImpressumText>
                            <S.ImpressumText>{t('contact.impressum.legal.disclaimer')}</S.ImpressumText>
                            <S.ImpressumText>{t('contact.impressum.legal.liability')}</S.ImpressumText>
                        </S.ImpressumSection>
                    </S.ImpressumContentWrapper>
                </S.ImpressumContainer>
            </S.ScreenWrapper>
        </S.PageContainer>
    );
};

export default LegalNoticePage;
