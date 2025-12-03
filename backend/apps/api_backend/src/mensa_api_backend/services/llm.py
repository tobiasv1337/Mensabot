"""
Mensabot API Backend — services.llm
Author: Tobias Veselsky
Description: LLM client and tool calling loop implementation.
"""

import json
from typing import List, Literal

from openai import OpenAI
from openai.types.chat import ChatCompletionMessage

from ..config import settings
from ..models import ChatMessage
from ..tools import TOOL_DEFINITIONS, TOOL_REGISTRY


# Initialize OpenAI client
client = OpenAI(api_key=settings.llm_api_key, base_url=settings.llm_base_url)


def format_message_history(messages: List[ChatMessage], format: Literal["openai"] = "openai") -> List[ChatCompletionMessage]:
    if format == "openai":
        messages: List[ChatCompletionMessage] = [*messages]
    else:
        raise ValueError(f"Unsupported target message format: {format}")

    return messages


def run_tool_calling_loop(messages: list[ChatMessage]) -> str:
    messages = format_message_history(messages)

    while True:
        completion = client.chat.completions.create(
            model=settings.llm_model,
            messages=messages,
            tools=TOOL_DEFINITIONS,
            tool_choice="auto",
            temperature=0.2,
        )
        print(f"Received completion: {completion.model_dump()}")
        choice = completion.choices[0]
        finish_reason = choice.finish_reason
        message = choice.message

        if finish_reason != "tool_calls":
            final_message = message
            break


        print("Tool calls detected!")
        tool_calls = message.tool_calls or []
        if not tool_calls:
            print("No tool calls found, exiting loop.")
            final_message = message
            break

        # Per OpenAI spec, we should append this tool calling message to the messages. But the SAIA backend seems to have issues with that responding that only a single tool call is allowed.
        #messages.append(message)

        print(f"Number of tool calls: {len(tool_calls)}")
        for call in tool_calls:
            tool_name = call.function.name
            raw_args = call.function.arguments
            print(f"Tool call ID: {call.id}, function: {tool_name}, arguments: {raw_args}")

            try:
                args = json.loads(raw_args)
            except json.JSONDecodeError as e:
                result = {"error": f"Failed to parse arguments: {str(e)}"}
            else:
                if tool_name in TOOL_REGISTRY:
                    result = TOOL_REGISTRY[tool_name](**args)
                else:
                    result = {"error": f"Unknown tool: {tool_name}"}

            messages.append(
                {
                    "role": "tool",
                    "tool_call_id": call.id,
                    "name": tool_name,
                    "content": json.dumps(result),
                }
            )

            if not (isinstance(result, dict) and "error" in result):
                messages.append(
                    {
                        "role": "system",
                        "content": (
                            "You have just successfully received the tool results you requested as a JSON object."
                            "You can assume these tool results to be 100% correct and accurate."
                            "You don't need to validate them and can fully trust them to answer the user query."
                            "Now either make further tool calls if needed, or answer the user based on the tool results."
                        ),
                    }
                )
            else:
                messages.append(
                    {
                        "role": "system",
                        "content": (
                            "The previous tool call failed and did NOT provide useful data. "
                            "You should not rely on this tool result. "
                            "Either try to call another tool to get the information you need, or if no suitable tool is available, either admit you don't know the answer or try to answer based on your internal knowledge, clearly stating that this is just your guess and may be outdated or incorrect."
                        ),
                    }
                )


    print("Final message content:")
    print(final_message.content)

    print("Info Log: All infos about this request:")
    print(messages)
    print(json.dumps(final_message.model_dump(), indent=2))

    return final_message.content
