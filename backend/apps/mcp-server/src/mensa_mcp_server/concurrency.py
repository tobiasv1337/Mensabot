import asyncio

from .settings import settings

IO_SEMAPHORE = asyncio.Semaphore(settings.io_max_concurrency)
