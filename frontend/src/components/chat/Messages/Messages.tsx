import ChatMessageBubble from "../Bubbles/ChatMessageBubble";
import React, { useEffect, useRef } from "react";
import MessageBubble from "./MessageBubble";
import { List, ScrollArea } from "./Messages.styles";

export type ChatRole = "assistant" | "user";

export type ChatMessage = {
    id: string;
    role: ChatRole;
    content: string;
    createdAt: number;
};

type MessagesProps = {
    messages: ChatMessage[];
};

const Messages: React.FC<MessagesProps> = ({ messages }) => {
    const endRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages.length]);

    return (
        <ScrollArea>
            <List>
                {messages.map((message, idx) => (
                    <ChatMessageBubble key={idx} message={message} />
                ))}
                <div ref={endRef} />
            </List>
        </ScrollArea>
    );
};

export default Messages;
