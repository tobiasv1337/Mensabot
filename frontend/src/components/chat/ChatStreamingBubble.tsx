import React from "react";
import { useTranslation } from "react-i18next";

import { ChatMessage } from "../../services/chats";
import ChatBubble from "./ChatBubble";
import { STREAMING_JUDGE_TRACE_ID, type ActiveStreamState } from "./chatStreamState";


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

const buildStreamingToolCalls = (stream: ActiveStreamState, judgeTraceLabel: string) => {
  const toolCalls = stream.traces.map((entry) => entry.trace);
  if (!stream.judge || stream.judge.state === "started") return toolCalls;

  return [
    ...toolCalls,
    {
      id: STREAMING_JUDGE_TRACE_ID,
      name: judgeTraceLabel,
      iteration: stream.judge.iteration,
      ok: stream.judge.state === "passed" ? true : stream.judge.state === "rejected" ? false : undefined,
      result: {
        state: stream.judge.state,
        verdict: stream.judge.verdict,
      },
    },
  ];
};

const ChatStreamingBubble: React.FC<ChatStreamingBubbleProps> = ({ stream, avatarSrc }) => {
  const { t } = useTranslation();
  const message = new ChatMessage("assistant", getStreamingStatusText(stream, t), {
    kind: "normal",
    toolCalls: buildStreamingToolCalls(stream, t("chat.streaming.judgeTraceLabel")),
  });
  return <ChatBubble message={message} avatarSrc={avatarSrc} />;
};

export default ChatStreamingBubble;
