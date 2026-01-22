import { MensaBotClient, type ChatApiResponse } from "./api";

type MessageKind = "normal" | "location_prompt";

export type ChatMessageData = {
	role: "user" | "assistant";
	content: string;
	meta: {
		kind: MessageKind;
	};
};

export class ChatMessage implements ChatMessageData {
	public role: "user" | "assistant";
	public content: string;
	public meta: ChatMessageData["meta"];

	constructor(role: "user" | "assistant", content: string, meta: ChatMessageData["meta"] = { kind: "normal" }) {
		this.role = role;
		this.content = content;
		this.meta = meta;
	}

	toJSON(): ChatMessageData {
		return {
			role: this.role,
			content: this.content,
			meta: this.meta,
		};
	}

	static fromJSON(json: ChatMessageData) {
		const meta: ChatMessageData["meta"] = json.meta ?? { kind: "normal" };
		return new ChatMessage(json.role, json.content, meta);
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

	clear() {
		this.#messages = [];
		try {
			localStorage.setItem(`chat-${this.id}`, JSON.stringify(this));
		} catch (error) {
			alert(`Due to a problem, your chat history could not be cleared.\n(Debug Information: ${error})`);
		}
	}

	delete() {
		try {
			localStorage.removeItem(`chat-${this.id}`);
		} catch (error) {
			alert(`Due to a problem, your chat could not be deleted.\n(Debug Information: ${error})`);
		}
	}

	async send(client: MensaBotClient, message: string): Promise<ChatApiResponse> {
		if (!(client instanceof MensaBotClient)) {
			throw new Error("argument 0 must be an instance of MensaBotClient");
		}

		this.addMessage(new ChatMessage("user", message));
		const response = await client.sendMessages(this.#messages);

		if (response.status === "needs_location") {
			this.addMessage(new ChatMessage("assistant", response.prompt, { kind: "location_prompt" }));
			return response;
		}

		this.addMessage(new ChatMessage("assistant", response.reply));
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

	static clearById(id: string) {
		const chat = Chats.getById(id, false);
		if (!chat) return false;
		chat.clear();
		return true;
	}

	static deleteById(id: string) {
		try {
			localStorage.removeItem(`chat-${id}`);
		} catch (error) {
			alert(`Due to a problem, the chat could not be deleted.\n(Debug Information: ${error})`);
		}
	}
}