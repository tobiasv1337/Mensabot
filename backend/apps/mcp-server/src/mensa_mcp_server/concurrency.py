import asyncio

from .settings import settings

_IO_SEMAPHORE: asyncio.Semaphore | None = None


def get_io_semaphore() -> asyncio.Semaphore:
    global _IO_SEMAPHORE
    if _IO_SEMAPHORE is None:
        _IO_SEMAPHORE = asyncio.Semaphore(settings.io_max_concurrency)
    return _IO_SEMAPHORE
