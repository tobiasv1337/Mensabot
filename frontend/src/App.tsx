import { useState } from 'react'
import type { KeyboardEvent } from 'react'
import './App.css'
import {useShortcutStorage} from "./hooks/useShortcutStorage.ts";
import {ShortcutList} from "./components/shortcut/ShortcutList.tsx";

type ChatResponse = {
  reply?: string
}

function App() {
  const [userInput, setUserInput] = useState('')
  const [backendResponse, setBackendResponse] = useState<string>('')
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string>('')

    const { shortcuts, addShortcut, removeShortcut } =
        useShortcutStorage("mensabot-shortcuts", []);

    const handleAddShortcut = () => {
        if (!userInput.trim()) return;
        addShortcut(userInput.trim());
        setUserInput("");
    };

  const sendMessage = async () => {
    if (!userInput.trim() || isSending) return

    setIsSending(true)
    setError('')
    const textToSend = userInput

    try {
      const response = await fetch('http://localhost:8000/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: textToSend }),
      })

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`)
      }

      const data = (await response.json()) as ChatResponse
      const reply = data.reply?.trim()
      setBackendResponse(reply || 'Keine Antwort vom Backend erhalten.')
    } catch (err) {
      console.error('Fehler beim Senden:', err)
      setError('Fehler beim Verbinden mit dem Backend.')
      setBackendResponse('')
    } finally {
      setUserInput('')
      setIsSending(false)
    }
  }

  const handleEnter = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      sendMessage()
    }
  }

  return (
    <main className="app">
      <h1 className="title">Mensabot</h1>

      <section className="response">
        {error ? (
          <p className="error">{error}</p>
        ) : (
          <p>{backendResponse || 'Warte auf deine Eingabe...'}</p>
        )}
      </section>
        <section className="shortcuts">
            <ShortcutList
                shortcuts={shortcuts}
                onShortcutClick={(s) => setUserInput(s)}
                onAddShortcut={handleAddShortcut}
                onDeleteShortcut={removeShortcut}
            />
        </section>
      <section className="input-row">
        <input
          type="text"
          value={userInput}
          onChange={(event) => setUserInput(event.target.value)}
          onKeyDown={handleEnter}
          disabled={isSending}
          placeholder="Gib hier deinen Text ein..."
        />
        <button
          type="button"
          onClick={sendMessage}
          disabled={!userInput.trim() || isSending}
        >
          {isSending ? 'Sende...' : 'Senden'}
        </button>
      </section>
    </main>
  )
}

export default App
