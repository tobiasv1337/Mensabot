import React from "react";
import styled from "styled-components";

const Wrapper = styled.div`
    text-align: center;
    font-size: 12px;
    line-height: 1.3;

    /* ✅ adapts to light + dark mode */
    color: ${({ theme }) => theme.textSecondary};

    /* small readability boost without looking like a box */
    opacity: 0.9;

    user-select: none;
`;

const AiWarningText: React.FC = () => {
    return <Wrapper>KI-generierte Antworten können Fehler enthalten.</Wrapper>;
};

export default AiWarningText;
