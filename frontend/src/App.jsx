import React, { useState } from "react";

export default function App() {
  const titel = "Mensabot Testseite";

  const [userInput, setUserInput] = useState("");
  const [backendResponse, setBackendResponse] = useState("");
  const [isSending, setIsSending] = useState(false);

  const sendMessage = async () => {
    if (!userInput.trim()) return;

    setIsSending(true);
    const textToSend = userInput;

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: textToSend }),
      });

      const data = await response.json();
      setBackendResponse(data.reply || "Keine Antwort vom Backend erhalten.");
    } catch (error) {
      console.error("Fehler beim Senden:", error);
      setBackendResponse("Fehler beim Verbinden mit dem Backend.");
    } finally {
      setUserInput("");
      setIsSending(false);
    }
  };

  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
      <h1>{titel}</h1>

      <div>
        {backendResponse ? (
          <p>{backendResponse}</p>
        ) : (
          <p>Warte auf deine Eingabe...</p>
        )}
      </div>

      <div>
        <input
          type="text"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          disabled={isSending}
          placeholder="Gib hier deinen Text ein..."
          style={{ marginRight: "10px" }}
        />
        <button
          onClick={sendMessage}
          disabled={!userInput.trim() || isSending}
        >
          {isSending ? "Sende..." : "Senden an Backend"}
        </button>
      </div>
    </div>
  );
}
