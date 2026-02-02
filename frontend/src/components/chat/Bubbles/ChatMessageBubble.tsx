import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";

import * as S from "./ChatMessageBubble.styles";

import mensabotLogo from "../../../assets/mensabot-logo-gradient-round.svg";
export type UiChatMessage = {
    role: "user" | "assistant";
    content: string;
};

interface Props {
    message: UiChatMessage;
}


const ChatMessageBubble: React.FC<Props> = ({ message }) => {
    const isUser = message.role === "user";

    return (
        <S.MessageRow $isUser={isUser}>
            {!isUser && <S.Avatar src={mensabotLogo} alt="Mensabot" />}

            <S.MessageContent $isUser={isUser}>
                <S.NameTag>{isUser ? "Du" : "Mensabot"}</S.NameTag>

                <S.MessageBubble $isUser={isUser}>
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeRaw, rehypeSanitize]}
                    >
                        {message.content}
                    </ReactMarkdown>
                </S.MessageBubble>
            </S.MessageContent>
        </S.MessageRow>
    );
};

export default ChatMessageBubble;
