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
        <div className="flex flex-col h-full">

            {!hasMessages && (
                <div className="flex flex-1 flex-col items-center justify-center gap-6">
                    <div className="w-full max-w-3xl">
                        <ShortcutBar
                            setUserInput={setUserInput}
                            userInput={userInput}
                        />
                    </div>

                    <div className="w-full max-w-3xl">
                        <ChatInput
                            userInput={userInput}
                            setUserInput={setUserInput}
                            sendMessage={sendMessage}
                            isSending={isSending}
                        />
                        <AiWarningText />
                    </div>
                </div>
            )}

            {hasMessages && (
                <div className="flex flex-col h-[90vh] justify-between gap-4">

                    <div className="flex-1 flex flex-col overflow-scroll">
                        <ChatMessages messages={messages} error={error} />
                    </div>

                    <div>
                        <ShortcutBar
                            setUserInput={setUserInput}
                            userInput={userInput}
                        />
                    </div>

                    <div>
                        <ChatInput
                            userInput={userInput}
                            setUserInput={setUserInput}
                            sendMessage={sendMessage}
                            isSending={isSending}
                        />
                        <AiWarningText />
                    </div>
                </div>
            )}
        </div>
    );
}