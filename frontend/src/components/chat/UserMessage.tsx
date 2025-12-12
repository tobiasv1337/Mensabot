import MessageBubble from "./MessageBubble";

export default function UserMessage({ text }: { text: string }) {
    return (
        <div className="w-full flex justify-end">
            <div className="flex items-start gap-3 max-w-[75%]">
                <div className="flex-1 min-w-0">
                    <MessageBubble text={text} isUser />
                </div>
                <div className="w-8 h-8 flex-shrink-0 rounded-full bg-purple-500 flex items-center justify-center text-white text-lg">
                    👤
                </div>
            </div>
        </div>
    );
}