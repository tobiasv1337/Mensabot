import React from "react";
import { useTranslation } from "react-i18next";

import { ChatMessage } from "../../services/chats";
import ChatBubble from "./ChatBubble";
import type { ActiveStreamState } from "./chatStreamState";


type ChatStreamingBubbleProps = {
  stream: ActiveStreamState;
  avatarSrc?: string;
};

const getStreamingStatusText = (stream: ActiveStreamState, t: ReturnType<typeof useTranslation>["t"]) => {
  if (stream.error) return stream.error;
  if (stream.judge?.state === "started") return t("chat.streaming.judgeRunning");
  if (stream.judge?.state === "rejected") return t("chat.streaming.judgeRejected");
  if (stream.judge?.state === "passed") return t("chat.streaming.judgePassed");
  if (stream.phase === "starting") return t("chat.streaming.starting");
  if (stream.phase === "waiting_for_llm") return t("chat.streaming.waitingForLlm");
  if (stream.phase === "executing_tools") return t("chat.streaming.executingTools");
  if (stream.phase === "waiting_for_judge") return t("chat.streaming.waitingForJudge");
  return t("chat.streaming.finalizing");
};

const buildStreamingToolCalls = (stream: ActiveStreamState) => stream.traces.map((entry) => entry.trace);

const ChatStreamingBubble: React.FC<ChatStreamingBubbleProps> = ({ stream, avatarSrc }) => {
  const { t } = useTranslation();
  const message = new ChatMessage("assistant", getStreamingStatusText(stream, t), {
    kind: "normal",
    toolCalls: buildStreamingToolCalls(stream),
  });
  return <ChatBubble message={message} avatarSrc={avatarSrc} />;
};

export default ChatStreamingBubble;
