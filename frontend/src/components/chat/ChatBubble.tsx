import React from "react";
import { useTranslation } from "react-i18next";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import type { ChatMessage } from "../../services/chats";
import * as S from "./chat.styles";

export type MessageAction = {
  id: string;
  label: string;
  onClick: () => void;
  variant?: "primary" | "secondary";
  disabled?: boolean;
};

const TOOL_PAYLOAD_PREVIEW_LIMIT = 6000;

const formatToolPayload = (payload: unknown) => {
  if (payload === undefined) return "—";
  if (payload === null) return "null";
  if (typeof payload === "string") return payload;
  try {
    const text = JSON.stringify(payload, null, 2);
    if (text.length > TOOL_PAYLOAD_PREVIEW_LIMIT) {
      return `${text.slice(0, TOOL_PAYLOAD_PREVIEW_LIMIT)}\n... (truncated)`;
    }
    return text;
  } catch {
    return String(payload);
  }
};

const omitMarkdownNode = <T extends { node?: unknown }>(props: T) => {
  const domProps = { ...props };
  delete domProps.node;
  return domProps;
};

type ChatBubbleProps = {
  message: ChatMessage;
  avatarSrc?: string;
  actions?: MessageAction[];
  actionsNote?: React.ReactNode;
};

const ChatBubble: React.FC<ChatBubbleProps> = ({ message, avatarSrc, actions = [], actionsNote }) => {
  const { t } = useTranslation();
  const isUser = message.role === "user";
  const toolCalls = message.meta.toolCalls ?? [];

  return (
    <S.MessageRow $isUser={isUser}>
      {!isUser && avatarSrc && <S.Avatar src={avatarSrc} alt={t("chat.nameBot")} />}
      <S.MessageContent $isUser={isUser}>
        <S.NameTag>{isUser ? t("chat.nameUser") : t("chat.nameBot")}</S.NameTag>
        <S.Bubble $isUser={isUser}>
          {toolCalls.length > 0 && (
            <S.ToolTraceGroup>
              <S.ToolTraceTitle>{t("chat.toolCalls", { count: toolCalls.length })}</S.ToolTraceTitle>
              {toolCalls.map((toolCall, toolIndex) => {
                const isJudge = toolCall.name === "__judge_correction__";

                if (isJudge) {
                  const verdict = typeof toolCall.result === "object" && toolCall.result !== null
                    ? (toolCall.result as Record<string, unknown>).verdict ?? ""
                    : "";
                  const proposedReply = typeof toolCall.args === "object" && toolCall.args !== null
                    ? (toolCall.args as Record<string, unknown>).proposed_reply ?? ""
                    : "";

                  return (
                    <S.JudgeDetails key={`judge-${toolIndex}`}>
                      <summary>
                        <span>
                          <S.ToolCallName>{t("chat.judgeCorrectionLabel")}</S.ToolCallName>
                          {toolCall.iteration && <S.ToolCallMeta>iter {toolCall.iteration}</S.ToolCallMeta>}
                        </span>
                        <S.JudgeStatus>{t("chat.judgeCorrected")}</S.JudgeStatus>
                      </summary>
                      <S.ToolCallBody>
                        <S.ToolCallSectionTitle>{t("chat.judgeVerdict")}</S.ToolCallSectionTitle>
                        <S.ToolCallCode>{String(verdict)}</S.ToolCallCode>
                        <S.ToolCallSectionTitle>{t("chat.judgeRejectedReply")}</S.ToolCallSectionTitle>
                        <S.ToolCallCode>{String(proposedReply)}</S.ToolCallCode>
                      </S.ToolCallBody>
                    </S.JudgeDetails>
                  );
                }

                const status: "ok" | "error" | "info" =
                  toolCall.ok === false ? "error" : toolCall.ok === true ? "ok" : "info";
                const requestPayload = toolCall.args ?? (toolCall.raw_args ? { raw_args: toolCall.raw_args } : undefined);
                const resultPayload = toolCall.error ? { error: toolCall.error } : toolCall.result;

                return (
                  <S.ToolCallDetails key={`${toolCall.name}-${toolIndex}`}>
                    <summary>
                      <span>
                        <S.ToolCallName>{toolCall.name}</S.ToolCallName>
                        {toolCall.iteration && <S.ToolCallMeta>iter {toolCall.iteration}</S.ToolCallMeta>}
                      </span>
                      <S.ToolCallStatus $status={status}>{status}</S.ToolCallStatus>
                    </summary>
                    <S.ToolCallBody>
                      <S.ToolCallSectionTitle>{t("chat.toolRequest")}</S.ToolCallSectionTitle>
                      <S.ToolCallCode>{formatToolPayload(requestPayload)}</S.ToolCallCode>
                      <S.ToolCallSectionTitle>{t("chat.toolResult")}</S.ToolCallSectionTitle>
                      <S.ToolCallCode>{formatToolPayload(resultPayload)}</S.ToolCallCode>
                    </S.ToolCallBody>
                  </S.ToolCallDetails>
                );
              })}
            </S.ToolTraceGroup>
          )}

          <S.MarkdownBody>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeRaw, rehypeSanitize]}
              components={{
                a: (props) => <a {...omitMarkdownNode(props)} target="_blank" rel="noreferrer" />,
                table: ({ children, ...props }) => (
                  <S.TableWrap>
                    <table {...omitMarkdownNode(props)}>{children}</table>
                  </S.TableWrap>
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>
          </S.MarkdownBody>

          {(actions.length > 0 || actionsNote) && (
            <S.ActionRow>
              {actions.map((action) => (
                <S.ActionButton
                  key={action.id}
                  type="button"
                  onClick={action.onClick}
                  disabled={action.disabled}
                  $variant={action.variant}
                >
                  {action.label}
                </S.ActionButton>
              ))}
              {actionsNote && <S.InlineError>{actionsNote}</S.InlineError>}
            </S.ActionRow>
          )}
        </S.Bubble>
      </S.MessageContent>
    </S.MessageRow>
  );
};

export default ChatBubble;
