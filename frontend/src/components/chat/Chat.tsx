import React, { useCallback, useState } from "react";
import AiWarningText from "./AiWarning/AiWarningText";
import ChatComposer from "./ChatComposer/ChatComposer";
import Messages from "./Messages/Messages";
import type { ChatMessage } from "./Messages/Messages";

import { ChatWrapper, BottomArea } from "./chat.styles";

const INITIAL_MESSAGES: ChatMessage[] = [
    {
        id: "m1",
        role: "assistant",
        content: "Hallo! Ich bin dein Mensabot 🤖\nWas bevorzugst du?",
        createdAt: 0, // or any fixed value; real timestamps start with user messages
    },
];


const Chat: React.FC = () => {
    const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);

    const onSend = useCallback((text: string) => {
        const userMsg: ChatMessage = {
            id: crypto.randomUUID(),
            role: "user",
            content: text,
            createdAt: Date.now(),
        };

        setMessages((prev) => [...prev, userMsg]);

        // later: call backend and append assistant response
    }, []);

    return (
        <ChatWrapper>
            <Messages messages={messages} />

            <BottomArea>
                <ChatComposer onSend={onSend} />
                <AiWarningText />
            </BottomArea>
        </ChatWrapper>
    );
};

export default Chat;
