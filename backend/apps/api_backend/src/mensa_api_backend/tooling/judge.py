"""LLM-as-a-Judge: validate final LLM responses before returning them to the user."""

from __future__ import annotations

from typing import Any, Dict, List

from ..i18n import DEFAULT_LANGUAGE, get_string
from ..logging import logger


_OK_MARKERS = frozenset({"ok", "ok.", "approved", "approved.", "correct", "correct.", "lgtm"})


async def judge_response(
    messages: List[Dict[str, Any]],
    proposed_reply: str,
    lang: str = DEFAULT_LANGUAGE,
) -> str | None:
    """Run the judge on a proposed final response.

    Args:
        messages: The full message history including system prompts, user messages,
                  tool calls and tool results from the current request.
        proposed_reply: The final text response the primary LLM wants to return.
        lang: Language code for the judge system prompt.

    Returns:
        ``None`` if the response is acceptable, or a correction string that should be
        injected as a system message to nudge the primary LLM.
    """
    # Import here to avoid circular dependency (loop.py imports judge.py,
    # and judge.py needs the retry-capable completion function from loop.py).
    from .loop import create_chat_completion_with_retry

    judge_prompt = get_string("judge_system_prompt", lang)
    if not judge_prompt:
        logger.warning("Judge system prompt not found for lang=%s; skipping judge.", lang)
        return None

    # Build a compact judge conversation:
    # 1. Judge system prompt
    # 2. The full conversation history (system prompts, user msgs, tool calls/results)
    # 3. The proposed final reply to evaluate
    judge_messages: List[Dict[str, Any]] = [
        {"role": "system", "content": judge_prompt},
        *messages,
        {
            "role": "user",
            "content": (
                "The assistant wants to send the following response to the user. "
                "Evaluate it.\n\n---\n\n" + proposed_reply
            ),
        },
    ]

    try:
        completion = await create_chat_completion_with_retry(
            messages=judge_messages,
            tools=[],  # Judge has no tool access
        )
    except Exception:
        logger.exception("Judge LLM call failed; skipping judge for this iteration.")
        return None

    if not getattr(completion, "choices", None):
        logger.warning("Judge returned no choices; skipping.")
        return None

    verdict_content = getattr(completion.choices[0].message, "content", None)
    if not isinstance(verdict_content, str) or not verdict_content.strip():
        logger.warning("Judge returned empty content; treating as OK.")
        return None

    verdict = verdict_content.strip()
    logger.info("Judge verdict: %s", verdict[:200])

    # If the judge says "OK" (or similar), the response is fine.
    # Check the full text, the first line (stripped of markdown bold), and the last line.
    normalised = verdict.lower().rstrip(".!")
    if normalised in _OK_MARKERS:
        return None

    first_line = verdict.split("\n", 1)[0].strip().strip("*").strip().lower().rstrip(".!")
    if first_line in _OK_MARKERS:
        return None

    # Check for a trailing verdict/urteil line like "Urteil: OK" or "Verdict: OK"
    last_line = verdict.rstrip().rsplit("\n", 1)[-1].strip().strip("*").strip().lower().rstrip(".!")
    if last_line in {"urteil: ok", "verdict: ok", "urteil: approved", "verdict: approved"}:
        return None

    return verdict
