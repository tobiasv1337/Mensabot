import React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";

const Wrapper = styled.div`
  text-align: center;
  font-size: 12px;
  color: ${({ theme }) => theme.textMuted};
`;

const AiWarningText: React.FC = () => {
  const { t } = useTranslation();
  return <Wrapper>{t("chat.aiWarning")}</Wrapper>;
};

export default AiWarningText;
