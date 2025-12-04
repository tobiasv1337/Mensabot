import type { MensaBotClient } from "./api";

export class ChatMessage {
	public role: "user" | "assistant";
	public content: string;

	constructor(role: "user" | "assistant", content: string) {
		this.role = role;
		this.content = content;
	}
}

export class Chat {
	#messages: ChatMessage[];
	public readonly id: string;

	constructor(id: string, messages: ChatMessage[] = []) {
		this.id = id;
		this.#messages = messages;
	}

	get messages() {
		return this.#messages;
	}

	addMessage(message: ChatMessage) {
		this.#messages.push(message);
		localStorage.setItem(`chat-${this.id}`, JSON.stringify(this));
	}

	async send(client: MensaBotClient, message: string) {
		this.addMessage(new ChatMessage("user", message));
		const response = await client.sendMessages(this.#messages);
		this.addMessage(new ChatMessage("assistant", response));
		return response;
	}

	toJSON() {
		return {
			id: this.id,
			messages: this.#messages,
		};
	}
}

export class Chats {
	static getById(id: string, createIfMissing = false) {
		const chatData = localStorage.getItem(`chat-${id}`);
		if (chatData) {
			return new Chat(id, JSON.parse(chatData).messages);
		} else if (createIfMissing) {
			const chat = new Chat(id);
			localStorage.setItem(`chat-${id}`, JSON.stringify(chat));
			return chat;
		} else return undefined;
	}

	static exists(id: string) {
		return localStorage.getItem(`chat-${id}`) !== null;
	}

	static deleteById(id: string) {
		localStorage.removeItem(`chat-${id}`);
	}
}