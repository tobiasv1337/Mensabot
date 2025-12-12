import styled from "styled-components";
import ChatMessages from "./ChatMessages";
import ShortcutBar from "../shortcut/ShortcutBar";
import ChatInput from "./ChatInput";
import AiWarningText from "./AiWarningText";

export interface ChatWindowProps {
    messages: { sender: "user" | "bot"; text: string }[];
    userInput: string;
    setUserInput: (v: string) => void;
    sendMessage: () => void;
    isSending: boolean;
    error: string;
}

const Root = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
`;

const EmptyState = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1.5rem; /* gap-6 */
`;

const MaxWidth = styled.div`
  width: 100%;
  max-width: 48rem; /* max-w-3xl */
`;

const ChatLayout = styled.div`
  display: flex;
  flex-direction: column;
  height: 90vh;     /* h-[90vh] */
  justify-content: space-between;
  gap: 1rem;        /* gap-4 */
`;

const MessagesWrapper = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: scroll; /* overflow-scroll */
`;

const Block = styled.div``;

export default function ChatWindow({
                                       messages,
                                       userInput,
                                       setUserInput,
                                       sendMessage,
                                       isSending,
                                       error,
                                   }: ChatWindowProps) {
    const hasMessages = messages.length > 0;

    return (
        <Root>
            {!hasMessages && (
                <EmptyState>
                    <MaxWidth>
                        <ShortcutBar setUserInput={setUserInput} userInput={userInput} />
                    </MaxWidth>

                    <MaxWidth>
                        <ChatInput
                            userInput={userInput}
                            setUserInput={setUserInput}
                            sendMessage={sendMessage}
                            isSending={isSending}
                        />
                        <AiWarningText />
                    </MaxWidth>
                </EmptyState>
            )}

            {hasMessages && (
                <ChatLayout>
                    <MessagesWrapper>
                        <ChatMessages messages={messages} error={error} />
                    </MessagesWrapper>

                    <Block>
                        <ShortcutBar setUserInput={setUserInput} userInput={userInput} />
                    </Block>

                    <Block>
                        <ChatInput
                            userInput={userInput}
                            setUserInput={setUserInput}
                            sendMessage={sendMessage}
                            isSending={isSending}
                        />
                        <AiWarningText />
                    </Block>
                </ChatLayout>
            )}
        </Root>
    );
}
