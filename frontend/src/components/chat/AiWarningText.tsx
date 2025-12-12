import styled from "styled-components";

const WarningText = styled.p`
  font-size: 11px;
  color: #6b7280; /* Tailwind gray-500 */
  text-align: center;
`;

export default function AiWarningText() {
    return (
        <WarningText>
            KI-generierte Antworten können Fehler enthalten.
        </WarningText>
    );
}
