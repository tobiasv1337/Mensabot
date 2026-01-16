import React, { useCallback, useMemo, useState } from "react";
import AiWarningText from "./AiWarning/AiWarningText";
import ChatComposer from "./ChatComposer/ChatComposer";
import Messages from "./Messages/Messages";
import {ChatWrapper, BottomArea, TopBar, NewChatButton, ChatContent} from "./chat.styles";

import { MensaBotClient } from "../../services/api";
import { Chats, ChatMessage, Chat } from "../../services/chats";

const CHAT_ID = "default";
const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? "";

const WELCOME_TEXT =
    "Hallo! Ich bin dein Mensabot 🤖\nBevor wir loslegen, lass mich deine Präferenzen kennenlernen.\nWas bevorzugst du?";

const ChatPage: React.FC = () => {
    /** client is stateless → memoized once */
    const client = useMemo(() => new MensaBotClient(API_BASE_URL), []);

    /** chat IS stateful → must live in React state */
    const [chat, setChat] = useState<Chat>(() => {
        const c = Chats.getById(CHAT_ID, true)!;
        if (c.messages.length === 0) {
            c.addMessage(new ChatMessage("assistant", WELCOME_TEXT));
        }
        return c;
    });

    const [isSending, setIsSending] = useState(false);

    /** start a brand-new chat */
    const startNewChat = useCallback(() => {
        if (isSending) return;

        Chats.deleteById(CHAT_ID);
        const fresh = Chats.getById(CHAT_ID, true)!;
        fresh.addMessage(new ChatMessage("assistant", WELCOME_TEXT));
        setChat(fresh);
    }, [isSending]);

    /** send message via backend */
    const onSend = useCallback(
        async (text: string) => {
            if (isSending) return;

            setIsSending(true);
            try {
                await chat.send(client, text);
                setChat((c) => c); // trigger rerender (chat mutates internally)
            } catch (error) {
                console.error("Chat send failed:", error);
                chat.addMessage(
                    new ChatMessage(
                        "assistant",
                        "❌ Server konnte nicht erreicht werden. Bitte versuche es später erneut."
                    )
                );
                setChat((c) => c);
            } finally {
                setIsSending(false);
            }
        },
        [chat, client, isSending]
    );

    /** map wrapper messages → UI messages */
    const uiMessages = chat.messages.map((m, idx) => ({
        id: `${CHAT_ID}-${idx}`,
        role: m.role,
        content: m.content,
        createdAt: 0,
    }));

    return (
        <ChatWrapper>
            <TopBar>
                <NewChatButton onClick={startNewChat} disabled={isSending}>
                    New chat
                </NewChatButton>
            </TopBar>

            <ChatContent>
                <Messages messages={uiMessages} />
                <BottomArea>
                    <ChatComposer onSend={onSend} disabled={isSending} />
                    <AiWarningText />
                </BottomArea>
            </ChatContent>
        </ChatWrapper>
    );
};

export default ChatPage;
