import React from "react";
import { useTranslation } from "react-i18next";
import mensaLogo from "../assets/mensabot-logo-gradient.svg";
import * as S from "./LandingPage.styles";
import { ChatIcon, MensenIcon, ShortcutsIcon } from "../assets/icons/icons";

interface LandingPageProps {
  onStartChat: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onStartChat }) => {
  const { t } = useTranslation();

  const features = [
    {
      id: "smart",
      icon: <ChatIcon />,
      title: t("landing.features.smart.title"),
      description: t("landing.features.smart.description"),
    },
    {
      id: "canteens",
      icon: <MensenIcon />,
      title: t("landing.features.canteens.title"),
      description: t("landing.features.canteens.description"),
    },
    {
      id: "fast",
      icon: <ShortcutsIcon />,
      title: t("landing.features.fast.title"),
      description: t("landing.features.fast.description"),
    },
  ];

  return (
    <S.LandingRoot>
      <S.HeroSection>
        <S.HeroContent>
          <S.LogoWrapper>
            <img src={mensaLogo} alt="Mensabot Logo" />
          </S.LogoWrapper>

          <S.HeroTitle>
            {t("landing.hero.titleStart")}{" "}
            <S.GradientSpan>{t("landing.hero.titleHighlight")}</S.GradientSpan>
          </S.HeroTitle>

          <S.HeroSubtitle>{t("landing.hero.subtitle")}</S.HeroSubtitle>

          <S.CTAButton onClick={onStartChat}>
            {t("landing.hero.cta")}
            <S.CTAArrow>→</S.CTAArrow>
          </S.CTAButton>
        </S.HeroContent>
      </S.HeroSection>

      <S.FeaturesSection>
        <S.FeaturesTitle>{t("landing.features.title")}</S.FeaturesTitle>
        <S.FeaturesGrid>
          {features.map((feature, index) => (
            <S.FeatureCard key={feature.id} $delay={index}>
              <S.FeatureIcon>{feature.icon}</S.FeatureIcon>
              <S.FeatureTitle>{feature.title}</S.FeatureTitle>
              <S.FeatureDescription>{feature.description}</S.FeatureDescription>
            </S.FeatureCard>
          ))}
        </S.FeaturesGrid>
      </S.FeaturesSection>

      <S.BottomSection>
        <S.BottomText>{t("landing.bottom.text")}</S.BottomText>
      </S.BottomSection>
    </S.LandingRoot>
  );
};

export default LandingPage;
