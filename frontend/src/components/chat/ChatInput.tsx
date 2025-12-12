import styled from "styled-components";

interface ChatInputProps {
    userInput: string;
    setUserInput: (v: string) => void;
    sendMessage: () => void;
    isSending: boolean;
}

const Container = styled.div`
  background: #1f2937;         /* gray-800 */
  border: 1px solid #374151;   /* gray-700 */
  border-radius: 0.75rem;      /* rounded-xl */
  padding: 0.75rem;            /* p-3 */
  display: flex;
  flex-direction: column;
  gap: 0.5rem;                 /* gap-2 */
`;

const Row = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const Input = styled.input`
  flex: 1;
  background: #111827;         /* gray-900 */
  border: 1px solid #374151;
  border-radius: 0.5rem;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  color: white;

  &:focus {
    outline: none;
    box-shadow: 0 0 0 2px #a855f7; /* purple-500 */
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const SendButton = styled.button`
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  background: #9333ea;         /* purple-600 */
  color: white;
  font-size: 0.875rem;
  transition: background 0.15s ease;

  &:hover:not(:disabled) {
    background: #a855f7;       /* purple-500 */
  }

  &:disabled {
    background: #4b5563;       /* gray-600 */
    cursor: not-allowed;
  }
`;

export default function ChatInput({
                                      userInput,
                                      setUserInput,
                                      sendMessage,
                                      isSending,
                                  }: ChatInputProps) {
    return (
        <Container>
            <Row>
                <Input
                    type="text"
                    value={userInput}
                    placeholder="Nachricht eingeben..."
                    onChange={(e) => setUserInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                    disabled={isSending}
                />

                <SendButton
                    onClick={sendMessage}
                    disabled={!userInput.trim() || isSending}
                >
                    {isSending ? "Sende..." : "Senden"}
                </SendButton>
            </Row>
        </Container>
    );
}
