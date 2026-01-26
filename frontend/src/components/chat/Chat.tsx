import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AiWarningText from "./AiWarning/AiWarningText";
import ChatComposer from "./ChatComposer/ChatComposer";
import Messages from "./Messages/Messages";

import {
    ChatWrapper,
    FiltersArea,
    FiltersBar,
    MessagesContainer,
    BottomArea,
    NewChatButton,
} from "./chat.styles";

import FilterBar, { type ChatFilters } from "./Filters/FilterBar";

import { MensaBotClient } from "../../services/api";
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

const ChatPage: React.FC = () => {
    const client = useMemo(() => new MensaBotClient(API_BASE_URL), []);

    const scrollRef = useRef<HTMLDivElement>(null);

    const [isSending, setIsSending] = useState(false);

    const [filters, setFilters] = useState<ChatFilters>({
        diet: [],
        mensas: [],
        allergens: [],
    });

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
        shouldAutoScrollRef.current = isNearBottom(el);

        return () => el.removeEventListener("scroll", onScroll);
    }, []);

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

        shouldAutoScrollRef.current = true;
    }, [isSending]);

    const onSend = useCallback(
        async (text: string) => {
            if (isSending) return;

            const trimmed = text.trim();
            if (!trimmed) return;

            setIsSending(true);
            try {
                shouldAutoScrollRef.current = true;

                // UI only for now: filters are not sent to backend yet
                // Next step is to pass "filters" into your chat.send call.

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
            <FiltersArea>
                <FiltersBar>
                    <FilterBar value={filters} onChange={setFilters} />

                    <NewChatButton onClick={startNewChat} disabled={isSending}>
                        New chat
                    </NewChatButton>
                </FiltersBar>
            </FiltersArea>

            <MessagesContainer ref={scrollRef}>
                <Messages messages={uiMessages} />
            </MessagesContainer>

            <BottomArea>
                <ChatComposer onSend={onSend} disabled={isSending} />
                <AiWarningText />
            </BottomArea>
        </ChatWrapper>
    );
};

export default ChatPage;
