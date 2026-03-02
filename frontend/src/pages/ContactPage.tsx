import React from 'react';
import { useTranslation } from 'react-i18next';
import * as S from './ContactPage.styles';
import * as P from '../components/page/PageHero.styles';
import { Button } from '../components/button/button';
import { ContactIcon, TuLogo, QualityAndUsabilityLogo } from "../components/icons";

const ContactPage: React.FC = () => {
    const { t } = useTranslation();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Placeholder handler for form submission
        alert(t('contact.form.success'));
    };

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
                        text="Stefan Hillmann"
                        onClick={() => window.location.href = "mailto:stefan.hillmann@tu-berlin.de"}
                    />

                </S.UpperSection>

                <S.FormContainer onSubmit={handleSubmit}>
                    <S.FormGroup>
                        <S.Label htmlFor="name">{t('contact.form.name')}</S.Label>
                        <S.Input type="text" id="name" placeholder={t('contact.form.namePlaceholder')} required />
                    </S.FormGroup>

                    <S.FormGroup>
                        <S.Label htmlFor="email">{t('contact.form.email')}</S.Label>
                        <S.Input type="email" id="email" placeholder={t('contact.form.emailPlaceholder')} required />
                    </S.FormGroup>

                    <S.FormGroup>
                        <S.Label htmlFor="message">{t('contact.form.message')}</S.Label>
                        <S.TextArea id="message" placeholder={t('contact.form.messagePlaceholder')} required />
                    </S.FormGroup>

                    <Button type="submit" variant="surfaceInsetBorder" text={t('contact.form.submit')} style={{ marginTop: '0.5rem' }} />
                </S.FormContainer>
            </S.ScreenWrapper>
        </S.PageContainer>
    );
};

export default ContactPage;
