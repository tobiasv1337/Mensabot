import { useState, useEffect, useRef } from 'react'
import type { KeyboardEvent } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import styled from 'styled-components'
import { useTheme } from './theme/themeProvider.tsx'
import ThemeDemo from './pages/ThemeDemo.tsx'
import { Chats, type Chat, ChatMessage } from './services/chats'
import { MensaBotClient } from './services/api'
import ChatPage from './pages/Chatpage'

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

const ClearChatButton = styled.button`
  background: ${props => props.theme.accent2};
  color: ${props => props.theme.textOnAccent2};
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const ChatHistorySection = styled.section`
  background: ${props => props.theme.surfaceCard};
  color: ${props => props.theme.textOnCard};
  padding: 1.5rem;
  border-radius: 0.5rem;
  margin: 1rem 0;
  min-height: 300px;
  max-height: 500px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1rem;
`

const MessageBubble = styled.div<{ $isUser: boolean }>`
  background: ${props => props.$isUser ? props.theme.accent1 : props.theme.surfaceInset};
  color: ${props => props.$isUser ? props.theme.textOnAccent1 : props.theme.textOnInset};
  padding: 0.75rem 1rem;
  border-radius: 1rem;
  max-width: 85%;
  align-self: ${props => props.$isUser ? 'flex-end' : 'flex-start'};
  ${props => props.$isUser && 'border-bottom-right-radius: 0.25rem;'}
  ${props => !props.$isUser && 'border-bottom-left-radius: 0.25rem;'}
`

const MessageRole = styled.div`
  font-size: 0.75rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
  opacity: 0.8;
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
  text-align: center;
`

const LocationActions = styled.div`
  margin-top: 0.75rem;
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  align-items: center;
`

const LocationButton = styled.button<{ $secondary?: boolean }>`
  background: ${props => props.$secondary ? props.theme.surfaceAccent : props.theme.accent1};
  color: ${props => props.$secondary ? props.theme.textOnAccent : props.theme.textOnAccent1};
  padding: 0.55rem 1rem;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`

const LocationError = styled.span`
  color: ${props => props.theme.accent1};
  font-size: 0.9rem;
`

const WaitingMessage = styled.p`
  color: ${props => props.theme.textMuted};
  text-align: center;
  font-style: italic;
`

function App() {
  const [showThemeDemo, setShowThemeDemo] = useState(false)
  const [showChatPage, setShowChatPage] = useState(false);
  const { toggleMode } = useTheme()
  const [userInput, setUserInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string>('')
  const [chat, setChat] = useState<Chat | null>(null)
  const [client, setClient] = useState<MensaBotClient | null>(null)
  const [, setUpdateTrigger] = useState(0) // Force re-render when messages change
  const [isRequestingLocation, setIsRequestingLocation] = useState(false)
  const [locationPromptHandled, setLocationPromptHandled] = useState(false)
  const [locationError, setLocationError] = useState<string>('')
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Initialize chat and client on mount
  useEffect(() => {
    const newChat = Chats.getById('default')
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin
    const newClient = new MensaBotClient(apiBaseUrl)
    if (newChat) setChat(newChat)
    setClient(newClient)
    setLocationPromptHandled(false)
  }, [])

  useEffect(() => {
    if (!chat) return;
    const lastMsg = chat.messages[chat.messages.length - 1];
    if (!lastMsg) return;

    if (lastMsg.meta?.kind === 'location_prompt') {
      setLocationPromptHandled(false);
      return;
    }

    setLocationPromptHandled(true);
  }, [chat?.messages.length]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chat?.messages.length])

  if (showThemeDemo) {
    return <ThemeDemo />
  }

  if (showChatPage) {
  return <ChatPage />;
  }
  const sendMessage = async (contentOverride?: string) => {
    const textSource = typeof contentOverride === 'string' ? contentOverride : userInput
    const text = typeof textSource === 'string' ? textSource.trim() : ''
    if (!text || isSending || !chat || !client) return

    setIsSending(true)
    setError('')

    try {
      const response = await chat.send(client, text)
      if (response.status !== 'needs_location') {
        setLocationError('')
      }
      setUpdateTrigger(prev => prev + 1) // Trigger re-render
    } catch (err) {
      console.error('Fehler beim Senden:', err)
      setError('Fehler beim Verbinden mit dem Backend.')
    } finally {
      if (!contentOverride) {
        setUserInput('')
      }
      setIsSending(false)
    }
  }

  const handleEnter = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter') return
    if (event.shiftKey) return

    event.preventDefault()
    sendMessage()
  }

  const clearChat = () => {
    if (!chat) return
    chat.clear()
    setUpdateTrigger(prev => prev + 1)
  }

  const handleShareLocation = async () => {
    if (isSending || isRequestingLocation) return
    if (!('geolocation' in navigator)) {
      setLocationError('Dein Browser unterstützt keine Standortfreigabe.')
      return
    }

    setLocationError('')
    setIsRequestingLocation(true)

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        const coordsMessage = `Mein Standort: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
        await sendMessage(coordsMessage)
        setLocationPromptHandled(true)
        setIsRequestingLocation(false)
      },
      (geoError) => {
        console.error('Geolocation error', geoError)
        setLocationError('Standort konnte nicht abgefragt werden. Bitte gib ihn manuell ein.')
        setLocationPromptHandled(true)
        setIsRequestingLocation(false)
      },
      { enableHighAccuracy: true, timeout: 15000 }
    )
  }

  const handleSelfLocation = () => {
    if (isSending || isRequestingLocation || !chat) return
    chat.addMessage(new ChatMessage('assistant', 'Bitte gib deinen Standort unten ins Textfeld ein, damit ich passende Mensen in deiner Nähe finden kann.', { kind: 'normal' }));
    setLocationPromptHandled(true)
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

        <div>
          <ThemeDemoButton onClick={() => setShowChatPage(true)}>
            💬 Zum Chat
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
          <ClearChatButton onClick={clearChat} disabled={!chat || chat.messages.length === 0}>
            🧹 Chat löschen
          </ClearChatButton>
        </ButtonGroup>

        {error && (
          <ErrorMessage>{error}</ErrorMessage>
        )}

        <ChatHistorySection>
          {!chat || chat.messages.length === 0 ? (
            <WaitingMessage>Starte eine Unterhaltung...</WaitingMessage>
          ) : (
            chat.messages.map((message: ChatMessage, index: number) => (
              <MessageBubble key={index} $isUser={message.role === 'user'}>
                <MessageRole>{message.role === 'user' ? 'Du' : 'Mensabot'}</MessageRole>
                <MarkdownResponse>
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeRaw, rehypeSanitize]}
                  >
                    {message.content}
                  </ReactMarkdown>
                </MarkdownResponse>
                {message.meta.kind === 'location_prompt' && index === chat.messages.length - 1 && !locationPromptHandled && (
                  <LocationActions>
                    <LocationButton
                      type="button"
                      onClick={handleShareLocation}
                      disabled={isSending || isRequestingLocation}
                    >
                      {isRequestingLocation ? 'Frage Standort ab...' : 'Aktuellen Standort teilen'}
                    </LocationButton>
                    <LocationButton
                      type="button"
                      $secondary
                      onClick={handleSelfLocation}
                      disabled={isSending || isRequestingLocation}
                    >
                      Manuell eingeben
                    </LocationButton>
                    {locationError && <LocationError>{locationError}</LocationError>}
                  </LocationActions>
                )}
              </MessageBubble>
            ))
          )}
          <div ref={chatEndRef} />
        </ChatHistorySection>

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
            onClick={() => sendMessage()}
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
