import styled, { css } from "styled-components";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";

interface MessageBubbleProps {
    text: string;
    isUser?: boolean;
}

const Bubble = styled.div<{ $isUser?: boolean }>`
    padding: 0.5rem 1rem;
    border-radius: 0.75rem;
    font-size: 0.875rem;
    word-break: break-word;

    ${({ $isUser }) =>
            $isUser
                    ? css`
                        background: #9333ea;
                        color: white;
                    `
                    : css`
                        background: #374151;
                        color: #f3f4f6;
                    `}

        /* Optional: nicer markdown spacing */
    & p {
        margin: 0;
    }
    & p + p {
        margin-top: 0.5rem;
    }
    & ul,
    & ol {
        margin: 0.5rem 0 0.5rem 1.25rem;
    }
    & code {
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono",
        "Courier New", monospace;
        font-size: 0.85em;
    }
    & pre {
        overflow: auto;
        padding: 0.75rem;
        border-radius: 0.5rem;
        background: rgba(0, 0, 0, 0.25);
        margin: 0.5rem 0 0;
    }
`;

export default function MessageBubble({ text, isUser }: MessageBubbleProps) {
    return (
        <Bubble $isUser={isUser}>
            {isUser ? (
                text
            ) : (
                <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeRaw, rehypeSanitize]}
                >
                    {text}
                </ReactMarkdown>
            )}
        </Bubble>
    );
}
