import { useState } from 'react'
import type { KeyboardEvent } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import styled from 'styled-components'
import { useTheme } from './theme/themeProvider.tsx'
import ThemeDemo from './pages/ThemeDemo.tsx'

const AppContainer = styled.main`
  min-height: 100vh;
  width: 100%;
  margin: 0;
  padding: 1rem;
  box-sizing: border-box;
  display: flex;
  justify-content: center;
  background: ${props => props.theme.surfacePage};
  color: ${props => props.theme.textOnPage};
`

const AppContent = styled.div`
  width: 100%;
  max-width: 720px;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
`

const Title = styled.h1`
  margin: 0;
  text-align: center;
  color: ${props => props.theme.textOnPage};
`

const ButtonGroup = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
`

const ThemeDemoButton = styled.button`
  background: ${props => props.theme.accent1};
  color: ${props => props.theme.textOnAccent1};
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  font-weight: bold;
  margin-bottom: 1rem;
  transition: transform 0.2s;

  &:hover {
    transform: translateY(-2px);
  }
`

const ThemeToggleButton = styled.button`
  background: ${props => props.theme.surfaceAccent};
  color: ${props => props.theme.textOnAccent};
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    transform: translateY(-2px);
  }
`

const ResponseSection = styled.section`
  background: ${props => props.theme.surfaceCard};
  color: ${props => props.theme.textOnCard};
  padding: 1.5rem;
  border-radius: 0.5rem;
  margin: 1rem 0;
  min-height: 4rem;
`

const MarkdownResponse = styled.div`
  line-height: 1.5;
  font-size: 0.95rem;
  word-wrap: break-word;

  > :first-child {
    margin-top: 0;
  }

  > :last-child {
    margin-bottom: 0;
  }

  p {
    margin: 0.5rem 0;
  }

  h1, h2, h3 {
    margin: 0.6rem 0 0.3rem;
    font-size: 1rem;
    font-weight: 600;
  }

  h4, h5, h6 {
    margin: 0.4rem 0 0.2rem;
    font-size: 0.95rem;
    font-weight: 600;
  }

  ul, ol {
    padding-left: 2.2rem;
    margin: 0.35rem 0;
  }

  li + li {
    margin-top: 0.15rem;
  }

  a {
    text-decoration: underline;
    text-underline-offset: 0.15em;
  }

  code {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
    font-size: 0.9em;
    padding: 0.1rem 0.25rem;
    border-radius: 0.25rem;
    background: ${props => props.theme.surfaceInset};
  }

  pre code {
    padding: 0;
    background: transparent;
    border-radius: 0;
    font-size: 0.9em;
  }

  pre {
    margin: 0.6rem 0;
    padding: 0.6rem 0.75rem;
    border-radius: 0.5rem;
    background: ${props => props.theme.surfaceInset};
    overflow-x: auto;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    margin: 0.75rem 0;
    font-size: 0.95em;
    display: block;
    overflow-x: auto;
  }

  th, td {
    padding: 0.55rem 0.6rem;
    border: 1px solid ${props => props.theme.textMuted};
    text-align: left;
    white-space: nowrap;
  }

  thead {
    background: ${props => props.theme.surfaceInset};
    font-weight: 600;
  }

  tbody tr:nth-child(odd) {
    background: ${props => props.theme.surfaceInset}40;
  }

  blockquote {
    margin: 0.5rem 0;
    padding: 0.5rem 0.75rem;
    border-radius: 0.5rem;
    border-left: 4px solid ${props => props.theme.accent2};
    background: ${props => props.theme.accent2}20;
    font-size: 0.9rem;
  }
`

const InputSection = styled.section`
  display: flex;
  gap: 0.5rem;
`

const StyledTextarea = styled.textarea`
  flex: 1;
  background: ${props => props.theme.surfaceInset};
  color: ${props => props.theme.textOnInset};
  border: 1px solid ${props => props.theme.textMuted};
  border-radius: 0.5rem;
  padding: 0.75rem;
  font-family: inherit;
  resize: vertical;

  &::placeholder {
    color: ${props => props.theme.textMuted};
  }

  &:focus {
    outline: 2px solid ${props => props.theme.accent1};
  }
`

const SendButton = styled.button`
  background: ${props => props.theme.accent1};
  color: ${props => props.theme.textOnAccent1};
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  font-weight: bold;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const ErrorMessage = styled.p`
  color: ${props => props.theme.accent1};
  font-weight: bold;
`

const WaitingMessage = styled.p`
  color: ${props => props.theme.textMuted};
`

type ChatResponse = {
  reply?: string
}

function App() {
  const [showThemeDemo, setShowThemeDemo] = useState(false)
  const { toggleMode } = useTheme()
  const [userInput, setUserInput] = useState('')
  const [backendResponse, setBackendResponse] = useState<string>('')
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string>('')

  if (showThemeDemo) {
    return <ThemeDemo />
  }

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

  const handleEnter = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter') return
    if (event.shiftKey) return

    event.preventDefault()
    sendMessage()
  }

  return (
    <AppContainer>
      <AppContent>
        <Title>Mensabot</Title>

        <div>
          <ThemeDemoButton onClick={() => setShowThemeDemo(true)}>
            🎨 Theme Demo anzeigen
          </ThemeDemoButton>
        </div>

        <ButtonGroup>
          <ThemeToggleButton onClick={() => toggleMode("light")}>
            ☀️ Light Mode
          </ThemeToggleButton>
          <ThemeToggleButton onClick={() => toggleMode("system")}>
            💻 System Mode
          </ThemeToggleButton>
          <ThemeToggleButton onClick={() => toggleMode("dark")}>
            🌙 Dark Mode
          </ThemeToggleButton>
        </ButtonGroup>

        <ResponseSection>
          {error ? (
            <ErrorMessage>{error}</ErrorMessage>
          ) : backendResponse ? (
            <MarkdownResponse>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw, rehypeSanitize]}
              >
                {backendResponse}
              </ReactMarkdown>
            </MarkdownResponse>
          ) : (
            <WaitingMessage>Warte auf deine Eingabe...</WaitingMessage>
          )}
        </ResponseSection>

        <InputSection>
          <StyledTextarea
            value={userInput}
            onChange={(event) => setUserInput(event.target.value)}
            onKeyDown={handleEnter}
            disabled={isSending}
            placeholder="Gib hier deinen Text ein..."
            rows={1}
            aria-label="Chat message input"
          />
          <SendButton
            type="button"
            onClick={sendMessage}
            disabled={!userInput.trim() || isSending}
          >
            {isSending ? 'Sende...' : 'Senden'}
          </SendButton>
        </InputSection>
      </AppContent>
    </AppContainer>
  )
}

export default App
