import { MensaBotClient } from "./api";

export type ChatMessageData = {
	role: "user" | "assistant";
	content: string;
};

export class ChatMessage implements ChatMessageData {
	public role: "user" | "assistant";
	public content: string;

	constructor(role: "user" | "assistant", content: string) {
		this.role = role;
		this.content = content;
	}

	toJSON(): ChatMessageData {
		return {
			role: this.role,
			content: this.content,
		};
	}

	static fromJSON(json: ChatMessageData) {
		return new ChatMessage(json.role, json.content);
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
		try {
			localStorage.setItem(`chat-${this.id}`, JSON.stringify(this));
		} catch (error) {
			alert(`Due to a problem, your chat history could not be saved.\n(Debug Information: ${error})`);
		}
	}

	async send(client: MensaBotClient, message: string) {
		if (!(client instanceof MensaBotClient)) {
			throw new Error("argument 0 must be an instance of MensaBotClient");
		}

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
	static getById(id: string, createIfMissing = true) {
		const chatData = localStorage.getItem(`chat-${id}`);
		if (chatData) {
			try {
				return new Chat(
					id,
					JSON.parse(chatData).messages.map(
						(message: ChatMessageData) => ChatMessage.fromJSON(message)
					)
				);
			} catch (error) {
				alert(`Due to a problem, your chat history could not be restored.\n(Debug Information: ${error})`);
				const chat = new Chat(id);
				localStorage.setItem(`chat-${id}`, JSON.stringify(chat));
				return chat;
			}
		} else if (createIfMissing) {
			const chat = new Chat(id);
			localStorage.setItem(`chat-${id}`, JSON.stringify(chat));
			return chat;
		} else return undefined;
	}

	static listIds() {
		return Object.keys(localStorage)
			.filter((key) => key.startsWith("chat-"))
			.map((key) => key.replace("chat-", ""));
	}

	static exists(id: string) {
		return localStorage.getItem(`chat-${id}`) !== null;
	}

	static deleteById(id: string) {
		localStorage.removeItem(`chat-${id}`);
	}
}