import asyncio

from .config import settings

IO_SEMAPHORE = asyncio.Semaphore(settings.io_max_concurrency)
LLM_SEMAPHORE = asyncio.Semaphore(settings.llm_max_concurrency)
