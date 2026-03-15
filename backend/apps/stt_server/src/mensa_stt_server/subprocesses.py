from __future__ import annotations

import asyncio
from dataclasses import dataclass
from typing import Sequence


@dataclass
class SubprocessResult:
    returncode: int
    stdout: str
    stderr: str


async def run_subprocess(
    argv: Sequence[str],
    *,
    timeout_s: float | None = None,
    cwd: str | None = None,
) -> SubprocessResult:
    proc = await asyncio.create_subprocess_exec(
        *argv,
        cwd=cwd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    try:
        stdout_b, stderr_b = await asyncio.wait_for(proc.communicate(), timeout=timeout_s)
    except asyncio.TimeoutError:
        proc.kill()
        try:
            await proc.wait()
        except Exception:
            # Best-effort cleanup after kill; preserve the original timeout exception.
            pass
        raise

    return SubprocessResult(
        returncode=int(proc.returncode or 0),
        stdout=(stdout_b or b"").decode("utf-8", errors="replace"),
        stderr=(stderr_b or b"").decode("utf-8", errors="replace"),
    )
