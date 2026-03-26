import type { ChatStreamEvent, ChatStreamPhase, JudgeStatusState } from "../../services/chatStream";
import type { ToolCallTrace } from "../../services/api";

type ActiveJudgeState = {
  iteration: number;
  state: JudgeStatusState;
  verdict?: string;
};

type ActiveTraceState = {
  traceId: string;
  trace: ToolCallTrace;
};

export type ActiveStreamState = {
  accepted: boolean;
  requestId?: string;
  phase: ChatStreamPhase;
  iteration?: number;
  traces: ActiveTraceState[];
  judge?: ActiveJudgeState;
  error?: string;
};

export const createInitialStreamState = (): ActiveStreamState => ({
  accepted: false,
  phase: "starting",
  traces: [],
});

const upsertActiveTrace = (traces: ActiveTraceState[], traceId: string, trace: ToolCallTrace): ActiveTraceState[] => {
  const existingIndex = traces.findIndex((item) => item.traceId === traceId);
  if (existingIndex === -1) return [...traces, { traceId, trace }];

  return traces.map((item, index) => index === existingIndex ? { traceId, trace } : item);
};

export const applyStreamEvent = (stream: ActiveStreamState | null, event: ChatStreamEvent): ActiveStreamState => {
  const current = stream ?? createInitialStreamState();

  if (event.type === "chat.accepted") return { ...current, accepted: true, requestId: event.request_id };
  if (event.type === "chat.phase") return { ...current, phase: event.phase, iteration: event.iteration ?? current.iteration };
  if (event.type === "chat.heartbeat") return { ...current, phase: event.phase, iteration: event.iteration ?? current.iteration };
  if (event.type === "tool.trace") return { ...current, iteration: event.trace.iteration ?? current.iteration, traces: upsertActiveTrace(current.traces, event.trace_id, event.trace) };
  if (event.type === "judge.status") return { ...current, judge: { iteration: event.iteration, state: event.state, verdict: event.verdict } };
  if (event.type === "chat.error") return { ...current, error: event.message };
  return current;
};
