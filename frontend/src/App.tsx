import { useState, useEffect, useRef } from 'react'
import type { KeyboardEvent } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import styled from 'styled-components'
import { useTheme } from './theme/themeProvider.tsx'
import ThemeDemo from './pages/ThemeDemo.tsx'
import { Chats, ChatMessage, type Chat } from './services/chats'
import { MensaBotClient } from './services/api'
import ChatPage from './pages/Chatpage'
import mensabotLogo from './assets/mensabot-logo-gradient-round.svg'
import { Button } from './components/button/button';
import mensabotLogo from './assets/react.svg';

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

const ToolToggleButton = styled.button<{ $active: boolean }>`
  background: ${props => props.$active ? props.theme.accent3 : props.theme.surfaceAccent};
  color: ${props => props.$active ? props.theme.textOnAccent3 : props.theme.textOnAccent};
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

const MessageRow = styled.div<{ $isUser: boolean }>`
  display: flex;
  align-items: flex-start;
  justify-content: ${props => props.$isUser ? 'flex-end' : 'flex-start'};
  gap: 0.75rem;
`

const Avatar = styled.img`
  width: 42px;
  height: 42px;
  border-radius: 999px;
  padding: 0.2rem;
  background: transparent;
  box-shadow: none;
  margin-top: 0.45rem;
`

const MessageContent = styled.div<{ $isUser: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: ${props => props.$isUser ? 'flex-end' : 'flex-start'};
  max-width: 85%;
`

const NameTag = styled.div`
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  opacity: 0.65;
  margin-bottom: 0.35rem;
`

const MessageBubble = styled.div<{ $isUser: boolean }>`
  position: relative;
  background: ${props => props.$isUser ? props.theme.accent1 : props.theme.surfaceInset};
  color: ${props => props.$isUser ? props.theme.textOnAccent1 : props.theme.textOnInset};
  padding: 1rem 1.1rem;
  border-radius: ${props => props.$isUser ? '1.35rem 1.35rem 0.45rem 1.35rem' : '1.35rem 1.35rem 1.35rem 0.45rem'};
  border: 1px solid ${props => props.$isUser ? `${props.theme.textOnAccent1}33` : `${props.theme.textMuted}33`};
  box-shadow: 0 12px 28px ${props => `${props.theme.textDark}26`}, 0 2px 8px ${props => `${props.theme.textDark}1A`};
  overflow: hidden;
  width: 100%;
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 16px 36px ${props => `${props.theme.textDark}2E`}, 0 4px 12px ${props => `${props.theme.textDark}24`};
  }
`

const ToolTraceGroup = styled.div`
  margin-bottom: 0.75rem;
  padding: 0 0 0.75rem;
  border-bottom: 1px solid ${props => `${props.theme.textMuted}33`};
`

const ToolTraceTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: ${props => props.theme.textSecondary};

  &::before {
    content: '';
    width: 0.55rem;
    height: 0.55rem;
    border-radius: 999px;
    background: ${props => props.theme.accent3};
    box-shadow: 0 0 0 3px ${props => props.theme.surfaceInset};
  }
`

const ToolCallDetails = styled.details`
  margin-top: 0.5rem;
  padding: 0;
  border: none;
  background: transparent;

  summary {
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    font-size: 0.85rem;
    font-weight: 600;
    list-style: none;
    padding: 0.45rem 0.6rem;
    border-radius: 0.65rem;
    background: ${props => props.theme.surfacePage};
    border: 1px solid ${props => `${props.theme.textMuted}33`};
    transition: border-color 0.2s ease, background 0.2s ease;
  }

  summary::-webkit-details-marker {
    display: none;
  }

  summary::after {
    content: '▾';
    font-size: 0.9rem;
    opacity: 0.7;
    transition: transform 0.2s ease;
  }

  &[open] summary {
    border-color: ${props => `${props.theme.accent2}66`};
  }

  &[open] summary::after {
    transform: rotate(180deg);
  }
`

const ToolCallName = styled.span`
  font-weight: 600;
`

const ToolCallMeta = styled.span`
  margin-left: 0.4rem;
  font-size: 0.75rem;
  opacity: 0.7;
`

const ToolCallStatus = styled.span<{ $status: "ok" | "error" | "info" }>`
  background: ${props =>
    props.$status === "ok"
      ? props.theme.accent3
      : props.$status === "error"
      ? props.theme.accent1
      : props.theme.surfaceAccent};
  color: ${props =>
    props.$status === "ok"
      ? props.theme.textOnAccent3
      : props.$status === "error"
      ? props.theme.textOnAccent1
      : props.theme.textOnAccent};
  margin-left: auto;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  font-size: 0.62rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  border: 1px solid ${props => `${props.theme.textMuted}33`};
  box-shadow: 0 4px 10px ${props => `${props.theme.textDark}1F`};

  &::before {
    content: '';
    width: 0.4rem;
    height: 0.4rem;
    border-radius: 999px;
    background: currentColor;
    opacity: 0.7;
  }
`

const ToolCallBody = styled.div`
  margin-top: 0.6rem;
  padding: 0.45rem 0.2rem 0.1rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
`

const ToolCallSectionTitle = styled.div`
  font-size: 0.66rem;
  font-weight: 800;
  opacity: 0.72;
  text-transform: uppercase;
  letter-spacing: 0.12em;
`

const ToolCallCode = styled.pre`
  margin: 0;
  padding: 0.65rem 0.75rem;
  border-radius: 0.7rem;
  background: ${props => props.theme.surfacePage};
  color: ${props => props.theme.textOnPage};
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 0.76rem;
  line-height: 1.45;
  white-space: pre-wrap;
  word-break: break-word;
  border: 1px solid ${props => `${props.theme.textMuted}33`};
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

const TOOL_PAYLOAD_PREVIEW_LIMIT = 6000

const formatToolPayload = (payload: unknown) => {
  if (payload === undefined) return '—'
  if (payload === null) return 'null'
  if (typeof payload === 'string') return payload
  try {
    const text = JSON.stringify(payload, null, 2)
    if (text.length > TOOL_PAYLOAD_PREVIEW_LIMIT) {
      return `${text.slice(0, TOOL_PAYLOAD_PREVIEW_LIMIT)}\n... (truncated)`
    }
    return text
  } catch {
    return String(payload)
  }
}

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
  const [showToolCalls, setShowToolCalls] = useState(() => {
    try {
      return localStorage.getItem('mensabot-show-tool-calls') === 'true'
    } catch {
      return false
    }
  })
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
    try {
      localStorage.setItem('mensabot-show-tool-calls', String(showToolCalls))
    } catch {
      alert('Error saving tool calls visibility setting to local storage.')
    }
  }, [showToolCalls])

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
      const response = await chat.send(client, text, { includeToolCalls: showToolCalls })
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

  const renderMessage = (message: ChatMessage, index: number, showLocationActions: boolean) => {
    const isUser = message.role === 'user'
    const shouldShowLocationPrompt =
      showLocationActions &&
      message.meta.kind === 'location_prompt' &&
      index === (chat?.messages.length ?? 0) - 1 &&
      !locationPromptHandled

    return (
      <MessageRow key={index} $isUser={isUser}>
        {!isUser && <Avatar src={mensabotLogo} alt="Mensabot" />}
        <MessageContent $isUser={isUser}>
          <NameTag>{isUser ? 'Du' : 'Mensabot'}</NameTag>
          <MessageBubble $isUser={isUser}>
            {showToolCalls && message.role === 'assistant' && message.meta.toolCalls && message.meta.toolCalls.length > 0 && (
              <ToolTraceGroup>
                <ToolTraceTitle>
                  Tool-Aufrufe · {message.meta.toolCalls.length}
                </ToolTraceTitle>
                {message.meta.toolCalls.map((toolCall, toolIndex) => {
                  const status: "ok" | "error" | "info" = toolCall.ok === false ? "error" : toolCall.ok === true ? "ok" : "info"
                  const requestPayload = toolCall.args ?? (toolCall.raw_args ? { raw_args: toolCall.raw_args } : undefined)
                  const resultPayload = toolCall.error ? { error: toolCall.error } : toolCall.result
                  return (
                    <ToolCallDetails key={`${toolCall.name}-${toolIndex}`}>
                      <summary>
                        <span>
                          <ToolCallName>{toolCall.name}</ToolCallName>
                          {toolCall.iteration && <ToolCallMeta>iter {toolCall.iteration}</ToolCallMeta>}
                        </span>
                        <ToolCallStatus $status={status}>{status}</ToolCallStatus>
                      </summary>
                      <ToolCallBody>
                        <ToolCallSectionTitle>Request</ToolCallSectionTitle>
                        <ToolCallCode>{formatToolPayload(requestPayload)}</ToolCallCode>
                        <ToolCallSectionTitle>Result</ToolCallSectionTitle>
                        <ToolCallCode>{formatToolPayload(resultPayload)}</ToolCallCode>
                      </ToolCallBody>
                    </ToolCallDetails>
                  )
                })}
              </ToolTraceGroup>
            )}
            <MarkdownResponse>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw, rehypeSanitize]}
              >
                {message.content}
              </ReactMarkdown>
            </MarkdownResponse>
            {shouldShowLocationPrompt && (
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
        </MessageContent>
      </MessageRow>
    )
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
          <Button 
            variant="primary" 
            text="Primary Action Button Test Dark" 
            onClick={() => toggleMode("dark")}
          ></Button>
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
          <ToolToggleButton
            $active={showToolCalls}
            onClick={() => setShowToolCalls(prev => !prev)}
          >
            🧰 Tool-Details {showToolCalls ? 'an' : 'aus'}
          </ToolToggleButton>
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
              renderMessage(message, index, true)
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
