import React from "react";
import * as S from "./FeatureCard.styles";

type FeatureCardProps = {
  className?: string;
  delay?: number;
  icon?: React.ReactNode;
  eyebrow?: React.ReactNode;
  value?: React.ReactNode;
  title?: React.ReactNode;
  meta?: React.ReactNode;
  description?: React.ReactNode;
  density?: "default" | "compact";
  valueMode?: "metric" | "compact" | "inline" | "label";
  valueNoWrap?: boolean;
};

export const FeatureCard: React.FC<FeatureCardProps> = ({ className, delay, icon, eyebrow, value, title, meta, description, density = "default", valueMode = "metric", valueNoWrap = false }) => (
  <S.CardRoot className={className} $delay={delay} $density={density}>
    {icon ? <S.IconBadge $density={density}>{icon}</S.IconBadge> : null}
    {eyebrow ? <S.Eyebrow>{eyebrow}</S.Eyebrow> : null}
    {value ? <S.Value $mode={valueMode} $noWrap={valueNoWrap}>{value}</S.Value> : null}
    {title ? <S.Title>{title}</S.Title> : null}
    {meta ? <S.Meta>{meta}</S.Meta> : null}
    {description ? <S.Description>{description}</S.Description> : null}
  </S.CardRoot>
);

export default FeatureCard;
