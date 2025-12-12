import { useEffect, useRef } from "react";
import styled from "styled-components";
import BotMessage from "./BotMessage";
import UserMessage from "./UserMessage";

export interface ChatMessagesProps {
    messages: { sender: "user" | "bot"; text: string }[];
    error: string;
}

const Container = styled.div`
  flex: 1;
  overflow-y: auto;
  background: #1f2937;       /* gray-800 */
  border: 1px solid #374151; /* gray-700 */
  border-radius: 0.75rem;    /* rounded-xl */
  padding: 1rem;             /* p-4 */

  /* space-y-3 */
  & > * + * {
    margin-top: 0.75rem;
  }
`;

const ErrorText = styled.p`
  color: #f87171; /* red-400 */
  font-size: 0.875rem;
`;

const HintText = styled.p`
  color: #9ca3af; /* gray-400 */
  font-size: 0.875rem;
`;

export default function ChatMessages({ messages, error }: ChatMessagesProps) {
    const bottomRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    return (
        <Container>
            {error && <ErrorText>{error}</ErrorText>}

            {messages.length === 0 && !error && (
                <HintText>Warte auf deine Eingabe...</HintText>
            )}

            {messages.map((msg, index) =>
                msg.sender === "user" ? (
                    <UserMessage key={index} text={msg.text} />
                ) : (
                    <BotMessage key={index} text={msg.text} />
                )
            )}

            <div ref={bottomRef} />
        </Container>
    );
}
