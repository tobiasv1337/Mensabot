import React from "react";
import styled from "styled-components";

const Wrapper = styled.div`
  text-align: center;
  font-size: 12px;
  color: ${({ theme }) => theme.textMuted};
`;


const AiWarningText: React.FC = () => {
  return (
      <Wrapper>
          KI-generierte Antworten können Fehler enthalten.
      </Wrapper>
  )
}

export default AiWarningText;
