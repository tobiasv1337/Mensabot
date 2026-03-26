import asyncio
from contextlib import suppress
from uuid import uuid4

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pydantic import ValidationError
from starlette.websockets import WebSocketState

from ..i18n import resolve_language
from ..logging import logger
from ..models import ChatStreamRequestEnvelope, ChatResponse
from ..streaming import ChatProgressSink, ChatStreamPhase, JudgeStatusState, ToolTraceState
from ..tooling.loop import run_tool_calling_loop


router = APIRouter()


class ClientDisconnectedError(Exception):
    """Raised when the WebSocket client disconnects while the backend is streaming."""


class WebSocketChatProgressSink(ChatProgressSink):
    def __init__(self, websocket: WebSocket):
        self.websocket = websocket
        self.seq = 0

    async def _send(self, payload: dict) -> None:
        self.seq += 1
        try:
            await self.websocket.send_json({"seq": self.seq, **payload})
        except (RuntimeError, WebSocketDisconnect) as exc:
            raise ClientDisconnectedError() from exc

    async def emit_request_accepted(self, request_id: str) -> None:
        await self._send({"type": "chat.accepted", "request_id": request_id})

    async def emit_phase(self, phase: ChatStreamPhase, iteration: int | None = None) -> None:
        payload = {"type": "chat.phase", "phase": phase}
        if iteration is not None:
            payload["iteration"] = iteration
        await self._send(payload)

    async def emit_heartbeat(self, *, phase: ChatStreamPhase, elapsed_ms: int, iteration: int | None = None) -> None:
        payload = {"type": "chat.heartbeat", "phase": phase, "elapsed_ms": elapsed_ms}
        if iteration is not None:
            payload["iteration"] = iteration
        await self._send(payload)

    async def emit_tool_trace(self, *, trace_id: str, state: ToolTraceState, trace) -> None:
        await self._send({"type": "tool.trace", "trace_id": trace_id, "state": state, "trace": trace.model_dump(mode="json")})

    async def emit_judge_status(self, *, iteration: int, state: JudgeStatusState, verdict: str | None = None) -> None:
        payload = {"type": "judge.status", "iteration": iteration, "state": state}
        if verdict is not None:
            payload["verdict"] = verdict
        await self._send(payload)

    async def emit_result(self, response: ChatResponse) -> None:
        await self._send({"type": "chat.result", "response": response.model_dump(mode="json")})

    async def emit_error(self, *, code: str, message: str) -> None:
        await self._send({"type": "chat.error", "code": code, "message": message})


async def _wait_for_disconnect(websocket: WebSocket) -> None:
    while True:
        message = await websocket.receive()
        if message.get("type") == "websocket.disconnect":
            raise ClientDisconnectedError()


async def _close_socket(websocket: WebSocket, code: int) -> None:
    if websocket.application_state == WebSocketState.DISCONNECTED:
        return
    with suppress(RuntimeError):
        await websocket.close(code=code)


@router.websocket("/api/chat/ws")
async def chat_ws(websocket: WebSocket) -> None:
    await websocket.accept()
    sink = WebSocketChatProgressSink(websocket)

    try:
        raw_message = await websocket.receive_json()
        request_envelope = ChatStreamRequestEnvelope.model_validate(raw_message)
    except WebSocketDisconnect:
        return
    except ValidationError:
        with suppress(ClientDisconnectedError):
            await sink.emit_error(code="invalid_request", message="Invalid chat.request payload.")
        await _close_socket(websocket, 1003)
        return
    except Exception:
        with suppress(ClientDisconnectedError):
            await sink.emit_error(code="invalid_request", message="Expected a JSON chat.request envelope.")
        await _close_socket(websocket, 1003)
        return

    request = request_envelope.payload
    request_id = str(uuid4())
    lang = resolve_language(request.language)

    try:
        await sink.emit_request_accepted(request_id)
        chat_task = asyncio.create_task(run_tool_calling_loop(request.messages, include_tool_calls=request.include_tool_calls, user_filters=request.filters, judge_correction=request.judge_correction, language=lang, progress_sink=sink))
        disconnect_task = asyncio.create_task(_wait_for_disconnect(websocket))

        done, pending = await asyncio.wait({chat_task, disconnect_task}, return_when=asyncio.FIRST_COMPLETED)

        for task in pending:
            task.cancel()
            with suppress(asyncio.CancelledError):
                await task

        if disconnect_task in done:
            with suppress(ClientDisconnectedError):
                disconnect_task.result()
            chat_task.cancel()
            with suppress(asyncio.CancelledError):
                await chat_task
            raise ClientDisconnectedError()

        await chat_task
    except ClientDisconnectedError:
        logger.info("Client disconnected from chat websocket stream.")
        return
    except Exception:
        logger.exception("Chat websocket stream failed unexpectedly.")
        await _close_socket(websocket, 1011)
        return

    await _close_socket(websocket, 1000)
