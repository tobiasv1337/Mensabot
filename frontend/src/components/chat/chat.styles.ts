import styled, { keyframes } from "styled-components";

const fadeUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const pulse = keyframes`
  0%, 80%, 100% {
    transform: scale(0.85);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
`;

export const ChatShell = styled.section`
  position: relative;
  display: grid;
  grid-template-rows: auto auto auto 1fr auto;
  height: 100%;
  min-height: 0;
  background: ${({ theme }) => theme.surfacePage};
  gap: 0;
`;

export const HeaderCard = styled.div`
  grid-row: 1;
  position: sticky;
  top: 0;
  z-index: 6;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  padding: 8px 0 10px;
  background: linear-gradient(180deg, ${({ theme }) => theme.surfacePage} 75%, transparent);
  backdrop-filter: blur(6px);
  border-bottom: 1px solid ${({ theme }) => `${theme.textMuted}14`};
`;

export const HeaderActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
`;

export const IconButton = styled.button<{ $variant?: "primary" | "ghost" }>`
  height: 34px;
  min-width: 34px;
  padding: 0 10px;
  border-radius: 12px;
  border: 1px solid
    ${({ theme, $variant }) =>
    $variant === "primary" ? "transparent" : `${theme.textMuted}30`};
  background: ${({ theme, $variant }) =>
    $variant === "primary" ? theme.accent1 : theme.surfacePage};
  color: ${({ theme, $variant }) =>
    $variant === "primary" ? theme.textOnAccent1 : theme.textPrimary};
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    border-color: ${({ theme, $variant }) =>
    $variant === "primary" ? "transparent" : `${theme.accent1}55`};
    box-shadow: ${({ theme, $variant }) =>
    $variant === "primary"
      ? `0 10px 20px ${theme.accent1}33`
      : `0 8px 16px ${theme.textDark}12`};
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.accent2};
    outline-offset: 2px;
  }
`;

export const IconButtonLabel = styled.span`
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  white-space: nowrap;

  @media (max-width: 720px) {
    display: none;
  }
`;

export const IconButtonLabelAlways = styled(IconButtonLabel)`
  @media (max-width: 720px) {
    display: inline;
  }
`;

export const FilterCard = styled.div<{ $open?: boolean }>`
  grid-row: 3;
  position: sticky;
  top: 40px;
  z-index: 5;
  overflow: ${({ $open }) => ($open ? "visible" : "hidden")};
  max-height: ${({ $open }) => ($open ? "360px" : "0")};
  opacity: ${({ $open }) => ($open ? 1 : 0)};
  transform: ${({ $open }) => ($open ? "none" : "translateY(-6px)")};
  transition: max-height 0.35s ease, opacity 0.2s ease, transform 0.2s ease;
  background: ${({ theme }) => theme.surfacePage};
  border-bottom: none;
`;

export const FilterBody = styled.div`
  display: grid;
  gap: 14px;
  padding: 10px 0 16px;
`;

export const FilterSection = styled.div`
  display: grid;
  gap: 8px;
`;

export const FilterLabel = styled.div`
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.textSecondary};
`;

export const PillRow = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: nowrap;
  overflow-x: auto;
  overflow-y: visible;
  padding: 4px 20px 6px;
  mask-image: none;
  -webkit-mask-image: none;
  scrollbar-width: none;
  -ms-overflow-style: none;
  cursor: grab;

  &.can-scroll-left {
    mask-image: linear-gradient(to right, transparent, black 20px, black calc(100% - 20px), black);
    -webkit-mask-image: linear-gradient(to right, transparent, black 20px, black calc(100% - 20px), black);
  }

  &.can-scroll-right {
    mask-image: linear-gradient(to right, black, black calc(100% - 20px), transparent);
    -webkit-mask-image: linear-gradient(to right, black, black calc(100% - 20px), transparent);
  }

  &.can-scroll-left.can-scroll-right {
    mask-image: linear-gradient(to right, transparent, black 20px, black calc(100% - 20px), transparent);
    -webkit-mask-image: linear-gradient(to right, transparent, black 20px, black calc(100% - 20px), transparent);
  }

  &::-webkit-scrollbar {
    width: 0;
    height: 0;
  }

  &.is-dragging {
    cursor: grabbing;
    user-select: none;
  }

  &.is-dragging * {
    user-select: none;
  }
`;

export const PillButton = styled.button<{ $selected?: boolean; $removable?: boolean }>`
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1.5px solid ${({ theme, $selected }) => ($selected ? `${theme.accent1}D9` : `${theme.accent1}55`)};
  background: ${({ theme, $selected }) => ($selected ? `${theme.accent1}3B` : "transparent")};
  color: ${({ theme, $selected }) => ($selected ? theme.accent1 : `${theme.accent1}B0`)};
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease, border-color 0.2s ease;
  box-shadow: ${({ theme, $selected }) =>
    $selected
      ? `0 6px 14px -6px ${theme.accent1}4D, inset 0 0 0 1px ${theme.accent1}40`
      : `inset 0 0 0 1px ${theme.accent1}06`};

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: ${({ theme, $selected }) =>
    $selected
      ? `0 8px 16px -8px ${theme.accent1}55, inset 0 0 0 1px ${theme.accent1}4D`
      : `0 6px 12px -6px ${theme.accent1}22`};
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.accent2};
    outline-offset: 2px;
  }
`;

export const PillIcon = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;

  img {
    width: 16px;
    height: 16px;
    display: block;
  }
`;

export const PillRemove = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.accent1};
  font-size: 14px;
  line-height: 1;
`;

export const PillInputShell = styled.label<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  height: 32px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px dashed ${({ theme, $active }) => ($active ? `${theme.accent1}AA` : `${theme.accent1}66`)};
  background: ${({ theme, $active }) => ($active ? `${theme.accent1}1F` : `${theme.accent1}12`)};
  color: ${({ theme }) => theme.accent1};
  cursor: text;
  transition: border-color 0.2s ease, background 0.2s ease;
`;

export const PillInput = styled.input`
  border: none;
  outline: none;
  background: transparent;
  color: ${({ theme }) => theme.textPrimary};
  font-size: 12px;
  font-weight: 600;
  min-width: 120px;
`;

export const CanteenSearchWrap = styled.div`
  position: relative;
  display: inline-flex;
  align-items: center;
`;

export const SearchDropdown = styled.div`
  position: fixed;
  padding: 6px;
  border-radius: 14px;
  border: 1px solid ${({ theme }) => `${theme.textMuted}26`};
  background: ${({ theme }) => theme.surfaceInset};
  display: grid;
  gap: 6px;
  max-height: 200px;
  overflow-y: auto;
  z-index: 10;
  box-shadow: 0 18px 32px ${({ theme }) => `${theme.textDark}1F`};
`;

export const SearchDropdownItem = styled.button<{ $muted?: boolean }>`
  all: unset;
  cursor: ${({ $muted }) => ($muted ? "default" : "pointer")};
  padding: 7px 10px;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
  color: ${({ theme, $muted }) => ($muted ? theme.textSecondary : theme.textPrimary)};
  background: ${({ theme }) => theme.surfacePage};
  border: 1px solid ${({ theme }) => `${theme.textMuted}18`};

  &:hover {
    ${({ $muted, theme }) =>
    !$muted &&
    `
      background: ${theme.surfaceCard};
      border-color: ${theme.accent1}55;
    `}
  }
`;

export const SearchDropdownMeta = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.textSecondary};
`;

export const ActiveFiltersRow = styled(PillRow)`
  grid-row: 2;
  position: sticky;
  top: 40px;
  z-index: 4;
  background: ${({ theme }) => theme.surfacePage};
  padding: 6px 20px 8px;
  border-bottom: none;
`;

export const MessagesCard = styled.section`
  grid-row: 4;
  position: relative;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => theme.surfacePage};
`;

export const MessagesScroll = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 14px 0 24px;
  scroll-behavior: smooth;
  overflow-anchor: none;
`;

export const MessageList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 18px;
`;

export const MessageRow = styled.div<{ $isUser?: boolean }>`
  display: flex;
  align-items: flex-start;
  justify-content: ${({ $isUser }) => ($isUser ? "flex-end" : "flex-start")};
  gap: 12px;
  animation: ${fadeUp} 0.35s ease both;
`;

export const Avatar = styled.img`
  width: 40px;
  height: 40px;
  border-radius: 999px;
  padding: 0.2rem;
  background: transparent;
  box-shadow: none;
  margin-top: 0.25rem;
  align-self: flex-end;
`;

export const MessageContent = styled.div<{ $isUser?: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: ${({ $isUser }) => ($isUser ? "flex-end" : "flex-start")};
  max-width: min(78%, 680px);
  gap: 6px;
`;

export const NameTag = styled.div`
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  opacity: 0.6;
  color: ${({ theme }) => theme.textSecondary};
`;

export const Bubble = styled.div<{ $isUser?: boolean }>`
  position: relative;
  background: ${({ $isUser, theme }) => ($isUser ? theme.accent1 : theme.surfaceInset)};
  color: ${({ $isUser, theme }) => ($isUser ? theme.textOnAccent1 : theme.textOnInset)};
  padding: 1rem 1.1rem;
  border-radius: ${({ $isUser }) => ($isUser ? "1.35rem 1.35rem 0.45rem 1.35rem" : "1.35rem 1.35rem 1.35rem 0.45rem")};
  border: 1px solid ${({ $isUser, theme }) => ($isUser ? `${theme.textOnAccent1}33` : `${theme.textMuted}33`)};
  box-shadow: 0 12px 28px ${({ theme }) => `${theme.textDark}1F`}, 0 2px 8px ${({ theme }) => `${theme.textDark}12`};
  width: 100%;
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 16px 36px ${({ theme }) => `${theme.textDark}24`}, 0 4px 12px ${({ theme }) => `${theme.textDark}1C`};
  }
`;

export const MarkdownBody = styled.div`
  line-height: 1.6;
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

  h1,
  h2,
  h3 {
    margin: 0.6rem 0 0.3rem;
    font-size: 1rem;
    font-weight: 600;
  }

  h4,
  h5,
  h6 {
    margin: 0.4rem 0 0.2rem;
    font-size: 0.95rem;
    font-weight: 600;
  }

  ul,
  ol {
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
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono",
      "Courier New", monospace;
    font-size: 0.9em;
    padding: 0.1rem 0.25rem;
    border-radius: 0.25rem;
    background: ${({ theme }) => theme.surfaceInset};
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
    background: ${({ theme }) => theme.surfaceInset};
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

  th,
  td {
    padding: 0.55rem 0.6rem;
    border: 1px solid ${({ theme }) => theme.textMuted};
    text-align: left;
    white-space: nowrap;
  }

  thead {
    background: ${({ theme }) => theme.surfaceInset};
    font-weight: 600;
  }

  tbody tr:nth-child(odd) {
    background: ${({ theme }) => `${theme.surfaceInset}40`};
  }

  blockquote {
    margin: 0.5rem 0;
    padding: 0.5rem 0.75rem;
    border-radius: 0.5rem;
    border-left: 4px solid ${({ theme }) => theme.accent2};
    background: ${({ theme }) => `${theme.accent2}20`};
    font-size: 0.9rem;
  }
`;

export const ToolTraceGroup = styled.div`
  margin-bottom: 0.75rem;
  padding: 0 0 0.75rem;
  border-bottom: 1px solid ${({ theme }) => `${theme.textMuted}33`};
`;

export const ToolTraceTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.textSecondary};

  &::before {
    content: '';
    width: 0.55rem;
    height: 0.55rem;
    border-radius: 999px;
    background: ${({ theme }) => theme.accent3};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.surfaceInset};
  }
`;

export const ToolCallDetails = styled.details`
  margin-top: 0.5rem;
  padding: 0;
  border: none;
  background: transparent;

  summary {
    cursor: pointer;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto auto;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.85rem;
    font-weight: 600;
    list-style: none;
    padding: 0.45rem 0.6rem;
    border-radius: 0.65rem;
    background: ${({ theme }) => theme.surfacePage};
    border: 1px solid ${({ theme }) => `${theme.textMuted}33`};
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
    justify-self: end;
  }

  &[open] summary {
    border-color: ${({ theme }) => `${theme.accent2}66`};
  }

  &[open] summary::after {
    transform: rotate(180deg);
  }
`;

export const ToolCallBody = styled.div`
  margin-top: 0.6rem;
  display: grid;
  gap: 0.45rem;
`;

export const ToolCallSectionTitle = styled.div`
  font-size: 0.7rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.textSecondary};
`;

export const ToolCallCode = styled.pre`
  margin: 0;
  padding: 0.6rem 0.7rem;
  border-radius: 0.7rem;
  background: ${({ theme }) => theme.surfacePage};
  border: 1px solid ${({ theme }) => `${theme.textMuted}22`};
  font-size: 0.75rem;
  line-height: 1.4;
  white-space: pre-wrap;
`;

export const ToolCallName = styled.span`
  font-weight: 600;
`;

export const ToolCallMeta = styled.span`
  margin-left: 0.4rem;
  font-size: 0.75rem;
  opacity: 0.7;
`;

export const ToolCallStatus = styled.span<{ $status: "ok" | "error" | "info" }>`
  background: ${({ theme, $status }) =>
    $status === "ok"
      ? theme.accent3
      : $status === "error"
        ? theme.accent1
        : theme.surfaceAccent};
  color: ${({ theme, $status }) =>
    $status === "ok" ? theme.textOnAccent3 : $status === "error" ? theme.textOnAccent1 : theme.textOnAccent};
  padding: 0.15rem 0.5rem;
  border-radius: 0.6rem;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
`;

export const ActionRow = styled.div`
  margin-top: 0.75rem;
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  align-items: center;
`;

export const ActionButton = styled.button<{ $variant?: "primary" | "secondary" }>`
  background: ${({ theme, $variant }) => ($variant === "secondary" ? theme.surfaceAccent : theme.accent1)};
  color: ${({ theme, $variant }) => ($variant === "secondary" ? theme.textOnAccent : theme.textOnAccent1)};
  padding: 0.55rem 1rem;
  border: none;
  border-radius: 0.6rem;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.85rem;
  transition: transform 0.2s ease;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.accent2};
    outline-offset: 2px;
  }
`;

export const InlineError = styled.span`
  color: ${({ theme }) => theme.accent1};
  font-size: 0.8rem;
  font-weight: 600;
`;

export const TypingBubble = styled(Bubble)`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  width: auto;
  padding: 0.85rem 1.1rem;
`;

export const TypingDot = styled.span`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  animation: ${pulse} 1.3s infinite ease-in-out;

  &:nth-child(2) {
    animation-delay: 0.2s;
  }

  &:nth-child(3) {
    animation-delay: 0.4s;
  }
`;

export const ScrollToLatest = styled.button`
  position: absolute;
  right: 18px;
  bottom: 44px;
  height: 44px;
  width: 44px;
  border-radius: 14px;
  border: 1px solid ${({ theme }) => `${theme.textMuted}40`};
  background: ${({ theme }) => theme.surfacePage};
  color: ${({ theme }) => theme.textPrimary};
  cursor: pointer;
  display: grid;
  place-items: center;
  box-shadow: 0 10px 20px ${({ theme }) => `${theme.textDark}14`};
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease, color 0.2s ease;

  &:hover {
    transform: translateY(-1px);
    border-color: ${({ theme }) => `${theme.textMuted}70`};
    box-shadow: 0 14px 24px ${({ theme }) => `${theme.textDark}1C`};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.accent2};
    outline-offset: 2px;
  }
`;

export const ComposerCard = styled.div`
  grid-row: 5;
  position: sticky;
  bottom: 0;
  z-index: 6;
  display: grid;
  gap: 10px;
  padding: 12px 0 8px;
  background: linear-gradient(180deg, transparent, ${({ theme }) => theme.surfacePage} 25%);
  border-top: none;
`;

export const ComposerRow = styled.div`
  display: flex;
  gap: 12px;
  align-items: flex-end;
`;

export const ComposerInputShell = styled.div`
  flex: 1;
  position: relative;
  display: grid;
  gap: 0;
  padding: 0;
  border-radius: 18px;
  border: 1.5px solid ${({ theme }) => `${theme.textMuted}44`};
  background: ${({ theme }) => theme.surfaceInset};
  box-shadow: 0 10px 24px ${({ theme }) => `${theme.textDark}18`};
  transition: border-color 0.2s ease, box-shadow 0.2s ease;

  &:focus-within {
    border-color: ${({ theme }) => `${theme.accent1}CC`};
    box-shadow:
      0 0 0 2px ${({ theme }) => `${theme.accent1}22`},
      0 12px 26px ${({ theme }) => `${theme.accent1}2B`};
  }
`;

export const ComposerTopRow = styled.div`
  display: flex;
  gap: 10px;
  align-items: flex-end;
  padding: 10px 12px;
  border-radius: 18px 18px 0 0;
  background: ${({ theme }) => theme.surfaceCard};
`;

export const ComposerTextarea = styled.textarea`
  flex: 1;
  border: none;
  outline: none;
  resize: none;
  min-height: 42px;
  max-height: 160px;
  background: transparent;
  color: ${({ theme }) => theme.textOnInset};
  font-size: 14px;
  line-height: 1.5;
  font-family: inherit;

  &::placeholder {
    color: ${({ theme }) => theme.textMuted};
  }
`;

export const CommandMenu = styled.div`
  position: absolute;
  left: 12px;
  right: 12px;
  bottom: calc(100% + 10px);
  padding: 10px;
  border-radius: 16px;
  border: 1px solid ${({ theme }) => `${theme.textMuted}2A`};
  background: ${({ theme }) => theme.surfaceInset};
  display: grid;
  gap: 10px;
  max-height: 260px;
  overflow-y: auto;
  z-index: 12;
  box-shadow: 0 18px 32px ${({ theme }) => `${theme.textDark}24`};
`;

export const CommandGroup = styled.div`
  display: grid;
  gap: 6px;
`;

export const CommandGroupTitle = styled.div`
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.textSecondary};
  padding: 0 4px;
`;

export const CommandItem = styled.button<{ $active?: boolean }>`
  all: unset;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid
    ${({ theme, $active }) => ($active ? `${theme.accent1}88` : `${theme.textMuted}22`)};
  background: ${({ theme, $active }) => ($active ? `${theme.accent1}22` : theme.surfacePage)};
  transition: transform 0.16s ease, border-color 0.2s ease, background 0.2s ease;

  &:hover {
    transform: translateY(-1px);
    border-color: ${({ theme }) => `${theme.accent1}77`};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.accent2};
    outline-offset: 2px;
  }
`;

export const CommandLabel = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.textPrimary};
`;

export const CommandMeta = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.textSecondary};
  margin-top: 2px;
`;

export const CommandBadge = styled.span`
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: ${({ theme }) => theme.accent1};
  background: ${({ theme }) => `${theme.accent1}1A`};
  border: 1px solid ${({ theme }) => `${theme.accent1}44`};
  white-space: nowrap;
`;

export const CommandEmpty = styled.div`
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px dashed ${({ theme }) => `${theme.textMuted}2A`};
  background: ${({ theme }) => theme.surfacePage};
  font-size: 12px;
  color: ${({ theme }) => theme.textSecondary};
`;

export const ShortcutRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px 10px;
`;

export const ShortcutAddButton = styled.button`
  width: 34px;
  height: 34px;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => `${theme.textMuted}44`};
  background: ${({ theme }) => theme.surfacePage};
  color: ${({ theme }) => theme.textPrimary};
  font-size: 20px;
  display: grid;
  place-items: center;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    border-color: ${({ theme }) => `${theme.accent1}88`};
    box-shadow: 0 6px 12px ${({ theme }) => `${theme.textDark}18`};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.accent2};
    outline-offset: 2px;
  }
`;

export const ShortcutPillRow = styled(PillRow)`
  flex: 1;
  gap: 8px;
  padding: 4px 0 2px;
`;

export const ShortcutPillButton = styled.button`
  height: 30px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => `${theme.textMuted}3F`};
  background: ${({ theme }) => theme.surfacePage};
  color: ${({ theme }) => theme.textPrimary};
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    border-color: ${({ theme }) => `${theme.accent1}77`};
    box-shadow: 0 6px 12px ${({ theme }) => `${theme.textDark}16`};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.accent2};
    outline-offset: 2px;
  }
`;

export const SendButton = styled.button`
  height: 42px;
  width: 46px;
  display: grid;
  place-items: center;
  border: none;
  border-radius: 14px;
  background: ${({ theme }) => theme.accent1};
  color: ${({ theme }) => theme.textOnAccent1};
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 10px 20px ${({ theme }) => `${theme.accent1}30`};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    box-shadow: none;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.accent2};
    outline-offset: 2px;
  }
`;

export const OnboardingContainer = styled.div`
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
`;

export const OnboardingSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
`;

export const OnboardingSectionLabel = styled.div`
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.textSecondary};
`;

export const OnboardingOptionsRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

export const OnboardingPill = styled.button<{ $selected?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  height: 32px;
  padding: 0 0.75rem;
  border-radius: 999px;
  border: 1.5px solid ${({ theme, $selected }) => ($selected ? `${theme.accent1}D9` : `${theme.textMuted}44`)};
  background: ${({ theme, $selected }) => ($selected ? `${theme.accent1}26` : `${theme.surfacePage}80`)};
  color: ${({ theme, $selected }) => ($selected ? theme.accent1 : theme.textPrimary)};
  font-size: 0.8rem;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  transition: transform 0.15s ease, border-color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-1px);
    border-color: ${({ theme, $selected }) => ($selected ? `${theme.accent1}` : `${theme.accent1}77`)};
    box-shadow: 0 4px 10px ${({ theme }) => `${theme.textDark}14`};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.accent2};
    outline-offset: 2px;
  }

  img {
    width: 16px;
    height: 16px;
  }
`;

export const OnboardingFooter = styled.div`
  margin-top: 0.5rem;
  padding-top: 1rem;
  border-top: 1px solid ${({ theme }) => `${theme.textMuted}22`};
`;

export const OnboardingSkipHint = styled.p`
  font-size: 1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.textPrimary};
  margin: 0;
  line-height: 1.5;
`;
