from __future__ import annotations

import asyncio
import functools
import tempfile
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.responses import JSONResponse

from .config import settings
from .model_download import ensure_model_file
from .subprocesses import run_subprocess


app = FastAPI()

_STT_SEMAPHORE: asyncio.Semaphore | None = None


def get_stt_semaphore() -> asyncio.Semaphore:
    global _STT_SEMAPHORE
    if _STT_SEMAPHORE is None:
        _STT_SEMAPHORE = asyncio.Semaphore(settings.max_concurrency)
    return _STT_SEMAPHORE


def _suffix_from_content_type(content_type: str | None) -> str:
    ct = (content_type or "").split(";", 1)[0].strip().lower()
    return {
        "audio/webm": ".webm",
        "audio/ogg": ".ogg",
        "audio/mpeg": ".mp3",
        "audio/wav": ".wav",
        "audio/x-wav": ".wav",
        "application/octet-stream": ".bin",
    }.get(ct, ".bin")


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


async def _ffmpeg_to_wav(input_path: Path, output_wav_path: Path) -> None:
    # Convert to 16kHz mono WAV which whisper.cpp expects.
    result = await run_subprocess(
        [
            "ffmpeg",
            "-hide_banner",
            "-loglevel",
            "error",
            "-y",
            "-i",
            str(input_path),
            "-ac",
            "1",
            "-ar",
            "16000",
            "-c:a",
            "pcm_s16le",
            str(output_wav_path),
        ],
        timeout_s=60,
    )
    if result.returncode != 0:
        raise HTTPException(status_code=400, detail=f"Failed to decode audio (ffmpeg): {result.stderr.strip() or 'unknown error'}")


async def _ffprobe_duration_s(wav_path: Path) -> float:
    result = await run_subprocess(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
            str(wav_path),
        ],
        timeout_s=20,
    )
    if result.returncode != 0:
        raise HTTPException(status_code=500, detail="Failed to inspect audio duration.")
    try:
        return float(result.stdout.strip())
    except ValueError:
        raise HTTPException(status_code=500, detail="Failed to parse audio duration.") from None


def _extract_transcript(output: str) -> str:
    # whisper-cli prints a mix of logs and transcript segments.
    # Keep this simple and resilient against upstream output changes.
    log_prefixes = (
        "whisper_",
        "ggml_",
        "main:",
        "system_info:",
        "error:",
        "usage:",
        "WARNING:",
    )

    parts: list[str] = []
    for line in output.splitlines():
        s = line.strip()
        if not s:
            continue
        if s.startswith(log_prefixes):
            continue
        # Typical transcript lines include timestamps like:
        # [00:00:00.000 --> 00:00:00.850]   And so my ...
        if s.startswith("[") and "-->" in s:
            end = s.find("]")
            if end != -1:
                s = s[end + 1 :].strip()
                if not s:
                    continue
        parts.append(s)

    return " ".join(parts).strip()


async def _whisper_transcribe(wav_path: Path, *, model_path: Path) -> str:
    argv = [
        settings.whisper_bin,
        "-m",
        str(model_path),
        "-f",
        str(wav_path),
        "-t",
        str(settings.threads),
    ]
    # `whisper-cli` defaults to English if no language is provided. For automatic language we specifically pass -l auto.
    lang = (settings.language or "").strip() or "auto"
    argv += ["-l", lang]

    try:
        result = await run_subprocess(argv, timeout_s=settings.timeout_s)
    except asyncio.TimeoutError:
        raise HTTPException(status_code=504, detail="Transcription timed out.")

    if result.returncode != 0:
        msg = (result.stderr or result.stdout).strip()
        raise HTTPException(status_code=500, detail=f"Transcription failed: {msg or 'unknown error'}")

    combined = "\n".join([result.stdout, result.stderr])
    text = _extract_transcript(combined)
    return " ".join(text.split()).strip()


@app.get("/health")
async def health() -> Response:
    model_path = settings.resolved_model_path()
    return JSONResponse(
        {
            "status": "ok",
            "whisper_bin": settings.whisper_bin,
            "model_path": str(model_path),
            "model_exists": model_path.exists(),
        }
    )


@app.post("/transcribe")
async def transcribe(request: Request) -> Response:
    async with get_stt_semaphore():
        audio_bytes = await _read_body_limited(request, max_bytes=settings.max_upload_bytes)
        suffix = _suffix_from_content_type(request.headers.get("content-type"))

        model_path = settings.resolved_model_path()
        if not model_path.exists():
            if settings.auto_download_model and not settings.model_path:
                try:
                    await asyncio.to_thread(
                        functools.partial(ensure_model_file, model_path, settings.model, timeout_s=120)
                    )
                except Exception as e:
                    raise HTTPException(status_code=500, detail=f"Failed to download model file: {e}")
            else:
                raise HTTPException(
                    status_code=500,
                    detail=f"Missing model file at {model_path}. Provide STT_MODEL_PATH or mount /models and set STT_MODEL.",
                )

        if not Path(settings.whisper_bin).exists():
            raise HTTPException(status_code=500, detail=f"Missing whisper binary at {settings.whisper_bin}.")

        with tempfile.TemporaryDirectory(prefix="mensa-stt-") as tmp_dir:
            tmp_dir_p = Path(tmp_dir)
            in_path = tmp_dir_p / f"input{suffix}"
            wav_path = tmp_dir_p / "input.wav"

            in_path.write_bytes(audio_bytes)
            await _ffmpeg_to_wav(in_path, wav_path)
            duration_s = await _ffprobe_duration_s(wav_path)

            # Enforce a duration cap (frontend also auto-stops at 180s).
            # Allow a small margin for timer drift, padding, conversion etc.
            if duration_s > float(settings.max_audio_seconds) + 2.0:
                raise HTTPException(
                    status_code=413,
                    detail=f"Audio too long ({duration_s:.1f}s). Max is {settings.max_audio_seconds}s.",
                )

            text = await _whisper_transcribe(wav_path, model_path=model_path)
            if not text:
                raise HTTPException(status_code=422, detail="No speech detected.")

            return JSONResponse({"text": text, "duration_s": duration_s})
