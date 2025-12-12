import MessageBubble from "./MessageBubble";

export default function BotMessage({ text }: { text: string }) {
    return (
        <div className="w-full flex">
            <div className="flex items-start gap-3 max-w-[75%]">
                <div className="w-8 h-8 flex-shrink-0 rounded-full bg-orange-500 flex items-center justify-center text-white text-lg">
                    🤖
                </div>
                <div className="flex-1 min-w-0">
                    <MessageBubble text={text} />
                </div>
            </div>
        </div>
    );
}