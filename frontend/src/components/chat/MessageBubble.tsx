interface MessageBubbleProps {
    text: string;
    isUser?: boolean;
}

export default function MessageBubble({ text, isUser }: MessageBubbleProps) {
    return (
        <div
            className={`px-4 py-2 rounded-xl text-sm break-words ${
                isUser
                    ? "bg-purple-600 text-white"
                    : "bg-gray-700 text-gray-100"
            }`}
        >
            {text}
        </div>
    );
}