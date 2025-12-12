import { useEffect, useRef } from "react";
import BotMessage from "./BotMessage";
import UserMessage from "./UserMessage";

export interface ChatMessagesProps {
    messages: { sender: "user" | "bot"; text: string }[];
    error: string;
}

export default function ChatMessages({ messages, error }: ChatMessagesProps) {
    const bottomRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        // Scroll to bottom whenever messages change
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    return (
        <div className="flex-1 overflow-y-auto bg-gray-800 border border-gray-700 rounded-xl p-4 space-y-3">

            {error && <p className="text-red-400 text-sm">{error}</p>}

            {messages.length === 0 && !error && (
                <p className="text-gray-400 text-sm">Warte auf deine Eingabe...</p>
            )}

            {messages.map((msg, index) =>
                msg.sender === "user" ? (
                    <UserMessage key={index} text={msg.text} />
                ) : (
                    <BotMessage key={index} text={msg.text} />
                )
            )}

            {/* Invisible anchor for scrolling */}
            <div ref={bottomRef} />
        </div>
    );
}
