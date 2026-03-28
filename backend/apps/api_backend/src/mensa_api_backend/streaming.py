from __future__ import annotations

import asyncio
from contextlib import suppress
from dataclasses import dataclass
from typing import Any, Coroutine, Literal, Protocol, TypeVar

from .models import ChatResponse, ToolCallTrace


ChatStreamPhase = Literal[
    "starting",
    "waiting_for_llm",
    "executing_tools",
    "waiting_for_judge",
    "finalizing",
]

ToolTraceState = Literal["started", "completed", "error"]
JudgeStatusState = Literal["started", "passed", "rejected", "skipped"]

T = TypeVar("T")


class ChatProgressSink(Protocol):
    async def emit_request_accepted(self, request_id: str) -> None: ...

    async def emit_phase(self, phase: ChatStreamPhase, iteration: int | None = None) -> None: ...

    async def emit_heartbeat(
        self,
        *,
        phase: ChatStreamPhase,
        elapsed_ms: int,
        iteration: int | None = None,
    ) -> None: ...

    async def emit_tool_trace(
        self,
        *,
        trace_id: str,
        state: ToolTraceState,
        trace: ToolCallTrace,
    ) -> None: ...

    async def emit_judge_status(
        self,
        *,
        iteration: int,
        state: JudgeStatusState,
        verdict: str | None = None,
    ) -> None: ...

    async def emit_result(self, response: ChatResponse) -> None: ...

    async def emit_error(self, *, code: str, message: str) -> None: ...


@dataclass(slots=True)
class NoOpChatProgressSink:
    async def emit_request_accepted(self, request_id: str) -> None:
        return None

    async def emit_phase(self, phase: ChatStreamPhase, iteration: int | None = None) -> None:
        return None

    async def emit_heartbeat(
        self,
        *,
        phase: ChatStreamPhase,
        elapsed_ms: int,
        iteration: int | None = None,
    ) -> None:
        return None

    async def emit_tool_trace(
        self,
        *,
        trace_id: str,
        state: ToolTraceState,
        trace: ToolCallTrace,
    ) -> None:
        return None

    async def emit_judge_status(
        self,
        *,
        iteration: int,
        state: JudgeStatusState,
        verdict: str | None = None,
    ) -> None:
        return None

    async def emit_result(self, response: ChatResponse) -> None:
        return None

    async def emit_error(self, *, code: str, message: str) -> None:
        return None


def build_trace_id(call_id: str | None, iteration: int, ordinal: int) -> str:
    if call_id:
        return call_id
    return f"iter-{iteration}-{ordinal}"


async def await_with_heartbeat(
    coroutine: Coroutine[Any, Any, T],
    progress_sink: ChatProgressSink,
    *,
    phase: ChatStreamPhase,
    iteration: int | None = None,
    heartbeat_interval_s: float = 3.0,
) -> T:
    task = asyncio.create_task(coroutine)
    loop = asyncio.get_running_loop()
    started_at = loop.time()

    try:
        while True:
            try:
                return await asyncio.wait_for(asyncio.shield(task), timeout=heartbeat_interval_s)
            except asyncio.TimeoutError:
                elapsed_ms = int((loop.time() - started_at) * 1000)
                await progress_sink.emit_heartbeat(
                    phase=phase,
                    elapsed_ms=elapsed_ms,
                    iteration=iteration,
                )
    except asyncio.CancelledError:
        task.cancel()
        with suppress(asyncio.CancelledError):
            await task
        raise
