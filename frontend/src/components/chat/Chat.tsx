import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AiWarningText from "./AiWarning/AiWarningText";
import ChatComposer from "./ChatComposer/ChatComposer";
import Messages from "./Messages/Messages";

import {
    ChatWrapper,
    TopBar,
    MessagesContainer,
    BottomArea,
    NewChatButton,
} from "./chat.styles";

import { MensaBotClient, type Canteen } from "../../services/api";
import { Chats, ChatMessage, Chat } from "../../services/chats";

const CHAT_ID = "default";
const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? "";

const WELCOME_TEXT =
    "Hallo! Ich bin dein Mensabot 🤖\nBevor wir loslegen, lass mich deine Präferenzen kennenlernen.\nWas bevorzugst du?";

const NEAR_BOTTOM_PX = 80;

const isNearBottom = (el: HTMLDivElement) => {
    const remaining = el.scrollHeight - el.scrollTop - el.clientHeight;
    return remaining <= NEAR_BOTTOM_PX;
};

type ChatProps = {
    selectedCanteen?: Canteen | null;
    resetKey?: number;
};

const ChatPage: React.FC<ChatProps> = () => {
    const client = useMemo(() => new MensaBotClient(API_BASE_URL), []);

    const scrollRef = useRef<HTMLDivElement>(null);

    const [isSending, setIsSending] = useState(false);

    // ✅ store chat instance in state (do NOT spread the class)
    const [chat, setChat] = useState<Chat>(() => {
        const c = Chats.getById(CHAT_ID, true)!;
        if (c.messages.length === 0) c.addMessage(new ChatMessage("assistant", WELCOME_TEXT));
        return c;
    });

    // ✅ use a simple version tick to force rerenders after internal mutations
    const [version, setVersion] = useState(0);

    // ✅ track whether we should auto-scroll (only if user is near bottom)
    const shouldAutoScrollRef = useRef(true);

    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;

        const onScroll = () => {
            shouldAutoScrollRef.current = isNearBottom(el);
        };

        el.addEventListener("scroll", onScroll, { passive: true });
        // initialize
        shouldAutoScrollRef.current = isNearBottom(el);

        return () => el.removeEventListener("scroll", onScroll);
    }, []);

    // ✅ scroll to bottom only if user is already near bottom
    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;

        if (shouldAutoScrollRef.current) {
            el.scrollTop = el.scrollHeight;
        }
    }, [version, chat.messages.length]);

    const startNewChat = useCallback(() => {
        if (isSending) return;

        Chats.deleteById(CHAT_ID);
        const fresh = Chats.getById(CHAT_ID, true)!;
        fresh.addMessage(new ChatMessage("assistant", WELCOME_TEXT));
        setChat(fresh);
        setVersion((v) => v + 1);

        // after new chat, we want to be at bottom (which is basically top)
        shouldAutoScrollRef.current = true;
    }, [isSending]);

    const onSend = useCallback(
        async (text: string) => {
            if (isSending) return;

            const trimmed = text.trim();
            if (!trimmed) return;

            setIsSending(true);
            try {
                // user is sending a new message → we do want to auto-scroll
                shouldAutoScrollRef.current = true;

                await chat.send(client, trimmed);
                setVersion((v) => v + 1);
            } catch (error) {
                console.error("Chat send failed:", error);

                chat.addMessage(
                    new ChatMessage(
                        "assistant",
                        "❌ Server konnte nicht erreicht werden. Bitte versuche es später erneut."
                    )
                );
                setVersion((v) => v + 1);
            } finally {
                setIsSending(false);
            }
        },
        [chat, client, isSending]
    );

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

            <MessagesContainer ref={scrollRef}>
                <Messages messages={uiMessages} />
            </MessagesContainer>

            <BottomArea>
                {/* ✅ staying in the input after pressing Enter is handled inside ChatComposer:
            - it should NOT blur
            - it should preventDefault
            - and it should keep focus on the input element after calling onSend
        */}
                <ChatComposer onSend={onSend} disabled={isSending} />
                <AiWarningText />
            </BottomArea>
        </ChatWrapper>
    );
};

export default ChatPage;
