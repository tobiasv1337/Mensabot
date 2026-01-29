import styled from "styled-components";

export const ScrollArea = styled.div`
    flex: 1;
    min-height: 0;
    overflow: auto;
    padding: 16px;
`;

export const List = styled.div`
    display: grid;
    gap: 10px;
    align-content: start;
`;

export const BubbleRow = styled.div<{ $role: "assistant" | "user" }>`
    display: flex;
    justify-content: ${({ $role }) => ($role === "user" ? "flex-end" : "flex-start")};
`;

export const Bubble = styled.div<{ $role: "assistant" | "user" }>`
    max-width: min(680px, 85%);
    padding: 10px 12px;
    border-radius: 14px;

    font-size: 14px;
    line-height: 1.35;

    color: ${({ theme, $role }) => ($role === "user" ? theme.textOnInset : theme.textOnCard)};

    background: ${({ theme, $role }) => ($role === "user" ? theme.surfaceInset : theme.surfaceCard)};

    border: 1px solid color-mix(in srgb, ${({ theme }) => theme.textMuted} 22%, transparent);

    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);

    white-space: pre-wrap;
    word-break: break-word;
`;

export const MarkdownBody = styled.div`
  & > :first-child {
    margin-top: 0;
  }
  & > :last-child {
    margin-bottom: 0;
  }

  p {
    margin: 0;
  }

  ul,
  ol {
    margin: 6px 0 0;
    padding-left: 18px;
  }

  code {
    padding: 2px 6px;
    border-radius: 8px;
    background: color-mix(in srgb, ${({ theme }) => theme.surfaceInset} 86%, transparent);
  }

  pre {
    margin: 8px 0 0;
    padding: 10px;
    border-radius: 12px;
    background: color-mix(in srgb, ${({ theme }) => theme.surfaceInset} 92%, transparent);
    border: 1px solid color-mix(in srgb, ${({ theme }) => theme.textMuted} 18%, transparent);
    overflow: auto;
  }

  pre code {
    background: transparent;
    padding: 0;
  }

  a {
    color: ${({ theme }) => theme.accent2};
    text-decoration: underline;
  }

  blockquote {
    margin: 8px 0 0;
    padding-left: 10px;
    border-left: 2px solid color-mix(in srgb, ${({ theme }) => theme.textMuted} 40%, transparent);
    color: ${({ theme }) => theme.textSecondary};
  }
`;
