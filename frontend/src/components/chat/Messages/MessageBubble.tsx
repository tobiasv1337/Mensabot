import React from "react";
import { Bubble, BubbleRow } from "./Messages.styles";
import type { ChatRole } from "./Messages";

type Props = {
    role: ChatRole;
    content: string;
};

const MessageBubble: React.FC<Props> = ({ role, content }) => {
    return (
        <BubbleRow $role={role}>
            <Bubble $role={role}>{content}</Bubble>
        </BubbleRow>
    );
};

export default MessageBubble;
