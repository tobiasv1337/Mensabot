import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";

import { Bubble, BubbleRow, MarkdownBody } from "./Messages.styles";
import type { ChatRole } from "./Messages";

type Props = {
    role: ChatRole;
    content: string;
};

const MessageBubble: React.FC<Props> = ({ role, content }) => {
    return (
        <BubbleRow $role={role}>
            <Bubble $role={role}>
                <MarkdownBody>
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeSanitize]}
                        components={{
                            a: ({ ...props }) => (
                                <a {...props} target="_blank" rel="noreferrer" />
                            ),
                        }}
                    >
                        {content}
                    </ReactMarkdown>
                </MarkdownBody>
            </Bubble>
        </BubbleRow>
    );
};

export default MessageBubble;
