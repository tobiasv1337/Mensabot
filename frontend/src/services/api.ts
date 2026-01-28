/**
 * @file
 * This is the API client for `/backend/apps/api_backend/src/mensa_api_backend`.
 * You can work with it directly although it is advised to work with the
 * storage-integrated higher-level classes from `./chats.ts`.
 * 
 * With `chats.ts`, sending a message would look like the following:
 * ```tsx
 * const chat = Chats.getById("my-chat");
 * const response = await chat.send(client, "Hello");
 * console.log("Message History:", chat.messages);
 * ```
 * 
 * With the raw {@link MensaBotClient}, you would have to manage
 * storage and sessions yourself.
 */

import type { ChatMessage } from "./chats";

export type ChatApiResponse =
	| { status: "ok"; reply: string }
	| { status: "needs_location"; prompt: string };

export class MensaBotClient {
	private baseUrl: string;

	constructor(baseUrl: string) {
		this.baseUrl = baseUrl;
	}

	async sendMessages(messages: ChatMessage[]): Promise<ChatApiResponse> {
		const request = await fetch(this.baseUrl + "/api/chat", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ messages })
		});

		if (!request.ok) {
			throw new Error(`Chat API error: ${request.status} ${request.statusText}`);
		}

		let response: unknown;
		try {
			response = await request.json();
		} catch (err) {
			throw new Error("Chat API returned invalid JSON");
		}

		const res = response as ChatApiResponse;
		if (res.status === "needs_location") {
			return { status: "needs_location", prompt: res.prompt };
		}

		if (res.status === "ok") {
			return { status: "ok", reply: res.reply };
		}

		throw new Error("Unexpected chat API response shape");
	}
}