import styled from "styled-components";
import MessageBubble from "./MessageBubble";

const Row = styled.div`
  width: 100%;
  display: flex;
  justify-content: flex-end;
`;

const MessageContainer = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;          /* gap-3 */
  max-width: 75%;
`;

const BubbleWrapper = styled.div`
  flex: 1;
  min-width: 0;
`;

const Avatar = styled.div`
  width: 2rem;           /* w-8 */
  height: 2rem;          /* h-8 */
  flex-shrink: 0;
  border-radius: 9999px; /* rounded-full */
  background: #a855f7;   /* purple-500 */
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.125rem;   /* text-lg */
`;

export default function UserMessage({ text }: { text: string }) {
    return (
        <Row>
            <MessageContainer>
                <BubbleWrapper>
                    <MessageBubble text={text} isUser />
                </BubbleWrapper>
                <Avatar>👤</Avatar>
            </MessageContainer>
        </Row>
    );
}
