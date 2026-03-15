from __future__ import annotations

import httpx
from fastapi import APIRouter, HTTPException, Request

from ..concurrency import get_stt_semaphore
from ..config import settings
from ..logging import logger
from ..models import TranscribeResponse


router = APIRouter()


async def _read_body_limited(request: Request, *, max_bytes: int) -> bytes:
    buf = bytearray()
    async for chunk in request.stream():
        if not chunk:
            continue
        buf.extend(chunk)
        if len(buf) > max_bytes:
            raise HTTPException(status_code=413, detail=f"Audio upload too large (max {max_bytes} bytes).")
    if not buf:
        raise HTTPException(status_code=400, detail="Empty request body.")
    return bytes(buf)


def _extract_error_detail(resp: httpx.Response) -> str:
    try:
        payload = resp.json()
        if isinstance(payload, dict) and isinstance(payload.get("detail"), str):
            return payload["detail"]
    except Exception:
        # If JSON decoding fails or payload shape is unexpected, fall back to response text.
        pass
    return (resp.text or "").strip() or "STT service error"


@router.post("/api/transcribe", response_model=TranscribeResponse)
async def transcribe(request: Request) -> TranscribeResponse:
    content_type = request.headers.get("content-type") or "application/octet-stream"

    async with get_stt_semaphore():
        audio_bytes = await _read_body_limited(request, max_bytes=settings.stt_max_upload_bytes)
        try:
            async with httpx.AsyncClient(timeout=settings.stt_timeout_s) as client:
                resp = await client.post(
                    f"{settings.stt_base_url.rstrip('/')}/transcribe",
                    content=audio_bytes,
                    headers={"Content-Type": content_type},
                )
        except httpx.RequestError as e:
            logger.exception("STT service request failed: %s", str(e))
            raise HTTPException(status_code=503, detail="Speech-to-text service unavailable.") from None

    if resp.status_code == 200:
        try:
            data = resp.json()
        except Exception:
            raise HTTPException(status_code=502, detail="STT service returned invalid JSON.") from None

        text = data.get("text") if isinstance(data, dict) else None
        duration_s = data.get("duration_s") if isinstance(data, dict) else None
        if not isinstance(text, str) or not text.strip():
            raise HTTPException(status_code=502, detail="STT service returned an invalid transcript.")
        return TranscribeResponse(text=text.strip(), duration_s=duration_s if isinstance(duration_s, (int, float)) else None)

    detail = _extract_error_detail(resp)
    if 400 <= resp.status_code < 500:
        raise HTTPException(status_code=resp.status_code, detail=detail)
    logger.error("STT service error (status=%s): %s", resp.status_code, detail)
    raise HTTPException(status_code=502, detail="Speech-to-text service failed.")
