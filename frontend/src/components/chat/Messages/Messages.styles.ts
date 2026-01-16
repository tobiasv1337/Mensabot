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

  color: rgba(255, 255, 255, 0.92);

  background: ${({ $role }) =>
    $role === "user" ? "rgba(42, 46, 50, 1)" : "rgba(61, 67, 75, 1)"};

  border: 1px solid rgba(255, 255, 255, 0.10);
  backdrop-filter: blur(10px);

  white-space: pre-wrap;
  word-break: break-word;
`;

export const MarkdownBody = styled.div`
  /* Avoid markdown adding weird top/bottom spacing */
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
    background: rgba(255, 255, 255, 0.08);
  }

  pre {
    margin: 8px 0 0;
    padding: 10px;
    border-radius: 12px;
    background: rgba(0, 0, 0, 0.35);
    overflow: auto;
  }

  pre code {
    background: transparent;
    padding: 0;
  }

  a {
    color: rgba(255, 255, 255, 0.9);
    text-decoration: underline;
  }

  blockquote {
    margin: 8px 0 0;
    padding-left: 10px;
    border-left: 2px solid rgba(255, 255, 255, 0.2);
    color: rgba(255, 255, 255, 0.75);
  }
`;



