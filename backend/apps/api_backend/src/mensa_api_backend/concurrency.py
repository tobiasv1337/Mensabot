import asyncio

from .config import settings

_IO_SEMAPHORE: asyncio.Semaphore | None = None
_LLM_SEMAPHORE: asyncio.Semaphore | None = None


def get_io_semaphore() -> asyncio.Semaphore:
    global _IO_SEMAPHORE
    if _IO_SEMAPHORE is None:
        _IO_SEMAPHORE = asyncio.Semaphore(settings.io_max_concurrency)
    return _IO_SEMAPHORE


def get_llm_semaphore() -> asyncio.Semaphore:
    global _LLM_SEMAPHORE
    if _LLM_SEMAPHORE is None:
        _LLM_SEMAPHORE = asyncio.Semaphore(settings.llm_max_concurrency)
    return _LLM_SEMAPHORE

