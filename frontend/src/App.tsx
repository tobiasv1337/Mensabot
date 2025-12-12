import { useState } from 'react'
import './App.css'
import ChatWindow from "./components/chat/ChatWindow";

type Message = {
    sender: "user" | "bot";
    text: string;
};

export default function App() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [userInput, setUserInput] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState("");

    const sendMessage = async () => {
        if (!userInput.trim() || isSending) return;

        const userMessage = userInput;
        setUserInput("");

        // Add user message directly
        setMessages((prev) => [...prev, { sender: "user", text: userMessage }]);
        setIsSending(true);
        setError("");

        try {
            const response = await fetch("http://localhost:8000/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: userMessage }),
            });

            if (!response.ok) throw new Error(`Status ${response.status}`);

            const data = await response.json();
            const botReply = data.reply ?? "Keine Antwort vom Backend erhalten.";

            // Add bot message
            setMessages((prev) => [...prev, { sender: "bot", text: botReply }]);
        } catch (err) {
            console.error(err);
            setMessages((prev) => [
                ...prev,
                { sender: "bot", text: "⚠ Es gab einen Fehler beim Abrufen der Daten." },
            ]);
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="h-screen w-screen bg-gray-900 text-gray-100 flex flex-col">
            <header className="h-16 border-b border-gray-800 flex items-center px-6">
                <h1 className="text-xl font-semibold">Mensabot</h1>
            </header>

            <main className="flex-1 max-w-4xl mx-auto w-full p-4">
                <ChatWindow
                    messages={messages}
                    userInput={userInput}
                    setUserInput={setUserInput}
                    sendMessage={sendMessage}
                    isSending={isSending}
                    error={error}
                />
            </main>
        </div>
    );

  //     <section className="response">
  //       {error ? (
  //         <p className="error">{error}</p>
  //       ) : backendResponse ? (
  //         <div className="markdown-response">
  //           <ReactMarkdown
  //             remarkPlugins={[remarkGfm]}
  //             rehypePlugins={[rehypeRaw, rehypeSanitize]}
  //           >
  //             {backendResponse}
  //           </ReactMarkdown>
  //         </div>
  //       ) : (
  //         <p>Warte auf deine Eingabe...</p>
  //       )}
  //     </section>
  //
  //     <section className="input-row">
  //       <textarea
  //         value={userInput}
  //         onChange={(event) => setUserInput(event.target.value)}
  //         onKeyDown={handleEnter}
  //         disabled={isSending}
  //         placeholder="Gib hier deinen Text ein..."
  //         rows={1}
  //         aria-label="Chat message input"
  //       />
  //       <button
  //         type="button"
  //         onClick={sendMessage}
  //         disabled={!userInput.trim() || isSending}
  //       >
  //         {isSending ? 'Sende...' : 'Senden'}
  //       </button>
  //     </section>
  //   </main>
  // )
}
