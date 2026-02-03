import { MensaBotClient, type ChatApiResponse, type ToolCallTrace, type Canteen } from "./api";

type MessageKind = "normal" | "location_prompt";

export type ChatMessageData = {
	role: "user" | "assistant";
	content: string;
	meta: {
		kind: MessageKind;
		toolCalls?: ToolCallTrace[];
	};
};

export type DietPreference = "vegetarian" | "vegan" | "meat" | null;

export type ChatFilters = {
	diet: DietPreference;
	allergens: string[];
	canteens: Canteen[];
};

export const defaultChatFilters: ChatFilters = {
	diet: null,
	allergens: [],
	canteens: [],
};

export class ChatMessage implements ChatMessageData {
	public role: "user" | "assistant";
	public content: string;
	public meta: ChatMessageData["meta"];

	constructor(role: "user" | "assistant", content: string, meta: ChatMessageData["meta"] = { kind: "normal" }) {
		this.role = role;
		this.content = content;
		this.meta = { kind: meta.kind ?? "normal", toolCalls: meta.toolCalls };
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
		return new ChatMessage(json.role, json.content, { kind: meta.kind ?? "normal", toolCalls: meta.toolCalls });
	}
}

export class Chat {
	#messages: ChatMessage[];
	#filters: ChatFilters;
	public readonly id: string;

	constructor(id: string, messages: ChatMessage[] = [], filters?: ChatFilters) {
		this.id = id;
		this.#messages = messages;
		const sourceFilters = filters ?? defaultChatFilters;
		this.#filters = {
			diet: sourceFilters.diet,
			allergens: [...sourceFilters.allergens],
			canteens: [...sourceFilters.canteens],
		};
	}

	get messages() {
		return this.#messages;
	}

	get filters() {
		return this.#filters;
	}

	private persist() {
		try {
			localStorage.setItem(`chat-${this.id}`, JSON.stringify(this));
		} catch (error) {
			alert(`Due to a problem, your chat history could not be saved.\n(Debug Information: ${error})`);
		}
	}

	addMessage(message: ChatMessage) {
		this.#messages.push(message);
		this.persist();
	}

	clear() {
		this.#messages = [];
		this.persist();
	}

	setFilters(filters: ChatFilters) {
		this.#filters = {
			...filters,
			allergens: [...filters.allergens],
			canteens: [...filters.canteens],
		};
		this.persist();
	}

	delete() {
		try {
			localStorage.removeItem(`chat-${this.id}`);
		} catch (error) {
			alert(`Due to a problem, your chat could not be deleted.\n(Debug Information: ${error})`);
		}
	}

	async send(client: MensaBotClient, message: string, options: { includeToolCalls?: boolean } = {}): Promise<ChatApiResponse> {
		if (!(client instanceof MensaBotClient)) {
			throw new Error("argument 0 must be an instance of MensaBotClient");
		}

		this.addMessage(new ChatMessage("user", message));
		const response = await client.sendMessages(this.#messages, options);
		const toolCalls = response.tool_calls && response.tool_calls.length > 0 ? response.tool_calls : undefined;

		if (response.status === "needs_location") {
			this.addMessage(new ChatMessage("assistant", response.prompt, { kind: "location_prompt", toolCalls }));
			return response;
		}

		this.addMessage(new ChatMessage("assistant", response.reply, { kind: "normal", toolCalls }));
		return response;
	}

	toJSON() {
		return {
			id: this.id,
			messages: this.#messages,
			filters: this.#filters,
		};
	}
}

export class Chats {
	static getById(id: string, createIfMissing = true) {
		const chatData = localStorage.getItem(`chat-${id}`);
		if (chatData) {
			try {
				const parsed = JSON.parse(chatData);
				const filters = parsed.filters ?? defaultChatFilters;
				return new Chat(
					id,
					parsed.messages.map((message: ChatMessageData) => ChatMessage.fromJSON(message)),
					{
						diet: filters.diet ?? defaultChatFilters.diet,
						allergens: Array.isArray(filters.allergens) ? filters.allergens : [],
						canteens: Array.isArray(filters.canteens) ? filters.canteens : [],
					}
				);
			} catch (error) {
				alert(`Due to a problem, your chat history could not be restored.\n(Debug Information: ${error})`);
				const chat = new Chat(id, [], defaultChatFilters);
				localStorage.setItem(`chat-${id}`, JSON.stringify(chat));
				return chat;
			}
		} else if (createIfMissing) {
			const chat = new Chat(id, [], defaultChatFilters);
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
