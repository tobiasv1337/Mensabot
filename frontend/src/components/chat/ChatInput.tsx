interface ChatInputProps {
    userInput: string;
    setUserInput: (v: string) => void;
    sendMessage: () => void;
    isSending: boolean;
}

export default function ChatInput({
                                      userInput,
                                      setUserInput,
                                      sendMessage,
                                      isSending,
                                  }: ChatInputProps) {
    return (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-3 flex flex-col gap-2">
            <div className="flex gap-2">
                <input
                    type="text"
                    className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm
                     focus:outline-none focus:ring-2 focus:ring-purple-500"
                    value={userInput}
                    placeholder="Nachricht eingeben..."
                    onChange={(e) => setUserInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                    disabled={isSending}
                />

                <button
                    onClick={sendMessage}
                    disabled={!userInput.trim() || isSending}
                    className="px-4 py-2 rounded-lg bg-purple-600 disabled:bg-gray-600
                     hover:bg-purple-500 transition text-sm"
                >
                    {isSending ? "Sende..." : "Senden"}
                </button>
            </div>
        </div>
    );
}
