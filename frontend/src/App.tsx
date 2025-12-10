import { useState } from 'react'
import type { KeyboardEvent } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import './App.css'
import { useTheme } from './theme/themeProvider.tsx'

type ChatResponse = {
  reply?: string
}

function App() {
  const { currentTheme, toggleMode } = useTheme()
  const [userInput, setUserInput] = useState('')
  const [backendResponse, setBackendResponse] = useState<string>('')
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string>('')

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
      <h1 className="title" style={{color: currentTheme.textPrimary}}>Mensabot</h1>

      <div>
        <button
          onClick={() => toggleMode("light")}
          style={{
            background: currentTheme.backgroundAccent,
            color: currentTheme.textContrast,
          }}
        >
        Light Mode
        </button>
        <button
          onClick={() => toggleMode("system")}
          style={{
            background: currentTheme.backgroundAccent,
            color: currentTheme.textContrast,
          }}
        >
        System Mode
        </button>
        <button
          onClick={() => toggleMode("dark")}
          style={{
            background: currentTheme.backgroundAccent,
            color: currentTheme.textContrast,
          }}
        >
        Dark Mode
        </button>
      </div>


      <section className="response">
        {error ? (
          <p className="error">{error}</p>
        ) : backendResponse ? (
          <div className="markdown-response">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeRaw, rehypeSanitize]}
            >
              {backendResponse}
            </ReactMarkdown>
          </div>
        ) : (
          <p>Warte auf deine Eingabe...</p>
        )}
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
