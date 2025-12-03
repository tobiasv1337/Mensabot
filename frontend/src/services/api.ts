// API - communication
// config fetch-function
// send chat Message

import type { ChatMessage } from "./chats";

export class MensaBotClient {
	private baseUrl: string;

	constructor(baseUrl: string) {
		this.baseUrl = baseUrl;
	}

	async sendMessages(messages: ChatMessage[]): Promise<string> {
		const request = await fetch(this.baseUrl + "/api/chat", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ messages })
		});
		const response = await request.json();
		return response.reply;
	}
}