import React from "react";
import styled from "styled-components";

const Wrapper = styled.div`
  text-align: center;
  font-size: 12px;
  color: #CBCCCD;

  /*
  padding: 8px 16px;
  margin-bottom: 8px;

  user-select: none;
   */
`;


const AiWarningText: React.FC = () => {
  return (
      <Wrapper>
          KI-generierte Antworten können Fehler enthalten.
      </Wrapper>
  )
}

export default AiWarningText;