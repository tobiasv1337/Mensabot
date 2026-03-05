import React from 'react';
import { useTranslation } from 'react-i18next';
import * as S from './ContactPage.styles';
import * as P from '../components/page/PageHero.styles';
import { Button } from '../components/button/button';
import { ContactIcon, TuLogo, QualityAndUsabilityLogo } from "../components/icons";

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

                    <Button
                        variant="accent1"
                        iconLeft={<ContactIcon />}
                        text={t('contact.mailButton')}
                        onClick={() => window.location.href = t('contact.mail')}
                    />

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
