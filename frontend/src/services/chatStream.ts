import type { ChatApiResponse, ToolCallTrace } from "./api";

export type ChatStreamPhase =
	| "starting"
	| "waiting_for_llm"
	| "executing_tools"
	| "waiting_for_judge"
	| "finalizing";

export type ToolTraceState = "started" | "completed" | "error";

export type JudgeStatusState = "started" | "passed" | "rejected" | "skipped";

export type ChatAcceptedEvent = {
	type: "chat.accepted";
	seq: number;
	request_id: string;
};

export type ChatPhaseEvent = {
	type: "chat.phase";
	seq: number;
	phase: ChatStreamPhase;
	iteration?: number;
};

export type ChatHeartbeatEvent = {
	type: "chat.heartbeat";
	seq: number;
	phase: ChatStreamPhase;
	iteration?: number;
	elapsed_ms: number;
};

export type ToolTraceEvent = {
	type: "tool.trace";
	seq: number;
	trace_id: string;
	state: ToolTraceState;
	trace: ToolCallTrace;
};

export type JudgeStatusEvent = {
	type: "judge.status";
	seq: number;
	iteration: number;
	state: JudgeStatusState;
	verdict?: string;
};

export type ChatResultEvent = {
	type: "chat.result";
	seq: number;
	response: ChatApiResponse;
};

export type ChatErrorEvent = {
	type: "chat.error";
	seq: number;
	code: string;
	message: string;
};

export type ChatStreamEvent =
	| ChatAcceptedEvent
	| ChatPhaseEvent
	| ChatHeartbeatEvent
	| ToolTraceEvent
	| JudgeStatusEvent
	| ChatResultEvent
	| ChatErrorEvent;

type StreamChatResponseOptions = {
	baseUrl: string;
	body: Record<string, unknown>;
	fallback: () => Promise<ChatApiResponse>;
	normalizeResponse: (response: unknown) => ChatApiResponse;
	onEvent?: (event: ChatStreamEvent) => void;
	onFallback?: () => void;
	acceptTimeoutMs?: number;
};

const DEFAULT_ACCEPT_TIMEOUT_MS = 1500;

const buildChatStreamUrl = (baseUrl: string, path: string) => {
	const target = `${baseUrl}${path}`;
	if (/^https?:\/\//.test(target)) {
		const url = new URL(target);
		url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
		return url.toString();
	}

	const normalizedPath = target.startsWith("/") ? target : `/${target}`;
	const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
	return `${protocol}//${window.location.host}${normalizedPath}`;
};

export const streamChatResponse = async ({
	baseUrl,
	body,
	fallback,
	normalizeResponse,
	onEvent,
	onFallback,
	acceptTimeoutMs = DEFAULT_ACCEPT_TIMEOUT_MS,
}: StreamChatResponseOptions): Promise<ChatApiResponse> =>
	await new Promise<ChatApiResponse>((resolve, reject) => {
		const wsUrl = buildChatStreamUrl(baseUrl, "/chat/ws");
		let socket: WebSocket | null = null;
		let settled = false;
		let accepted = false;
		let fallbackStarted = false;
		let acceptTimer: number | null = null;

		const clearAcceptTimer = () => {
			if (acceptTimer === null) return;
			window.clearTimeout(acceptTimer);
			acceptTimer = null;
		};

		const closeSocket = () => {
			if (!socket) return;
			try {
				socket.close();
			} catch {
				// ignore
			}
		};

		const resolveOnce = (response: ChatApiResponse) => {
			if (settled) return;
			settled = true;
			clearAcceptTimer();
			window.setTimeout(() => {
				if (socket?.readyState === WebSocket.OPEN) socket.close(1000, "done");
			}, 0);
			resolve(response);
		};

		const rejectOnce = (error: Error) => {
			if (settled) return;
			settled = true;
			clearAcceptTimer();
			closeSocket();
			reject(error);
		};

		const startFallback = () => {
			if (accepted || fallbackStarted || settled) return;
			fallbackStarted = true;
			clearAcceptTimer();
			closeSocket();
			onFallback?.();
			void fallback().then(resolveOnce).catch((error: unknown) => {
				rejectOnce(error instanceof Error ? error : new Error("Chat request failed"));
			});
		};

		const handleStreamFailure = (message: string) => {
			if (!accepted) {
				startFallback();
				return;
			}
			rejectOnce(new Error(message));
		};

		try {
			socket = new WebSocket(wsUrl);
		} catch {
			startFallback();
			return;
		}

		acceptTimer = window.setTimeout(() => {
			handleStreamFailure("Chat stream timed out before acceptance");
		}, acceptTimeoutMs);

		socket.onopen = () => {
			if (settled || fallbackStarted || !socket) return;
			try {
				socket.send(JSON.stringify({ type: "chat.request", payload: body }));
			} catch {
				handleStreamFailure("Chat stream request could not be sent");
			}
		};

		socket.onmessage = (event) => {
			if (settled) return;

			let parsed: unknown;
			try {
				parsed = JSON.parse(typeof event.data === "string" ? event.data : String(event.data));
			} catch {
				handleStreamFailure("Chat stream returned invalid JSON");
				return;
			}

			const streamEvent = parsed as Partial<ChatStreamEvent>;
			if (typeof streamEvent.type !== "string" || typeof streamEvent.seq !== "number") {
				handleStreamFailure("Chat stream returned an invalid event");
				return;
			}

			if (streamEvent.type === "chat.accepted") {
				accepted = true;
				clearAcceptTimer();
			}

			onEvent?.(streamEvent as ChatStreamEvent);

			if (streamEvent.type === "chat.result") {
				resolveOnce(normalizeResponse((streamEvent as ChatResultEvent).response));
				return;
			}

			if (streamEvent.type === "chat.error") {
				handleStreamFailure((streamEvent as ChatErrorEvent).message || "Chat stream failed");
			}
		};

		socket.onerror = () => {
			handleStreamFailure("Chat stream connection failed");
		};

		socket.onclose = (event) => {
			if (settled || fallbackStarted) return;
			handleStreamFailure(accepted ? event.reason || "Chat stream closed unexpectedly" : "Chat stream closed before acceptance");
		};
	});
