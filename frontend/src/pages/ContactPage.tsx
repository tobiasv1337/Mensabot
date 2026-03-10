import React from 'react';
import { useTranslation } from 'react-i18next';
import * as S from './ContactPage.styles';
import * as P from '../components/page/PageHero.styles';
import { Button } from '../components/button/button';
import { MailIcon, GitHubIcon } from "../components/icons";
import { TuLogo, QualityAndUsabilityLogo } from "../components/iconsLogos";

const ContactPage: React.FC = () => {
    const { t } = useTranslation();

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
                            iconLeft={<GitHubIcon />}
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

export default ContactPage;
