import { MensaBotClient, type ChatApiResponse, type ToolCallTrace, type Canteen } from "./api";

type MessageKind = "normal" | "location_prompt" | "directions_prompt";

type DirectionsMeta = {
	lat?: number;
	lng?: number;
};

const CHAT_STORAGE_PREFIX = "chat-";
const CHAT_INDEX_KEY = "mensabot-chats-index";
const CHAT_ACTIVE_KEY = "mensabot-active-chat-id";
const DEFAULT_CHAT_TITLE = "Neuer Chat";
const TITLE_MAX_WORDS = 6;
const TITLE_MAX_CHARS = 42;
const PREVIEW_MAX_CHARS = 80;

export type ChatMessageData = {
	role: "user" | "assistant";
	content: string;
	meta: {
		kind: MessageKind;
		toolCalls?: ToolCallTrace[];
		directions?: DirectionsMeta;
	};
};

export type DietPreference = "vegetarian" | "vegan" | "meat" | null;

export type ChatFilters = {
	diet: DietPreference;
	allergens: string[];
	canteens: Canteen[];
};

export type ChatSummary = {
	id: string;
	title: string;
	createdAt: number;
	updatedAt: number;
	preview?: string;
};

type ChatIndex = {
	version: 1;
	order: string[];
	byId: Record<string, ChatSummary>;
};

export const defaultChatFilters: ChatFilters = {
	diet: null,
	allergens: [],
	canteens: [],
};

const clampText = (value: string, maxChars: number) => {
	if (value.length <= maxChars) return value;
	return `${value.slice(0, maxChars).trimEnd()}...`;
};

const normalizeTitle = (value: string) => {
	const cleaned = value.replace(/\s+/g, " ").trim();
	if (!cleaned) return DEFAULT_CHAT_TITLE;
	return clampText(cleaned, TITLE_MAX_CHARS);
};

const deriveTitleFromMessage = (value: string) => {
	const trimmed = value.trim();
	if (!trimmed) return DEFAULT_CHAT_TITLE;
	const withoutCommand = trimmed.replace(/^\/\S+\s*/, "");
	const words = withoutCommand.split(/\s+/).filter(Boolean);
	if (words.length === 0) return DEFAULT_CHAT_TITLE;
	const base = words.slice(0, TITLE_MAX_WORDS).join(" ");
	return normalizeTitle(base);
};

const buildPreview = (value?: string) => {
	if (!value) return "";
	const cleaned = value.replace(/\s+/g, " ").trim();
	if (!cleaned) return "";
	return clampText(cleaned, PREVIEW_MAX_CHARS);
};

const makeChatIndex = (): ChatIndex => ({
	version: 1,
	order: [],
	byId: {},
});

export class ChatMessage implements ChatMessageData {
	public role: "user" | "assistant";
	public content: string;
	public meta: ChatMessageData["meta"];

	constructor(role: "user" | "assistant", content: string, meta: ChatMessageData["meta"] = { kind: "normal" }) {
		this.role = role;
		this.content = content;
		this.meta = { kind: meta.kind ?? "normal", toolCalls: meta.toolCalls, directions: meta.directions };
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
		return new ChatMessage(json.role, json.content, { kind: meta.kind ?? "normal", toolCalls: meta.toolCalls, directions: meta.directions });
	}
}

export class Chat {
	#messages: ChatMessage[];
	#filters: ChatFilters;
	#title: string;
	#createdAt: number;
	#updatedAt: number;
	#hasUserMessage: boolean;
	public readonly id: string;

	constructor(id: string, messages: ChatMessage[] = [], filters?: ChatFilters, meta?: { title?: string; createdAt?: number; updatedAt?: number }) {
		this.id = id;
		this.#messages = messages;
		const sourceFilters = filters ?? defaultChatFilters;
		this.#filters = { diet: sourceFilters.diet, allergens: [...sourceFilters.allergens], canteens: [...sourceFilters.canteens] };
		this.#title = normalizeTitle(meta?.title ?? DEFAULT_CHAT_TITLE);
		const now = Date.now();
		this.#createdAt = typeof meta?.createdAt === "number" ? meta.createdAt : now;
		this.#updatedAt = typeof meta?.updatedAt === "number" ? meta.updatedAt : this.#createdAt;
		this.#hasUserMessage = messages.some((message) => message.role === "user");
	}

	get messages() {
		return this.#messages;
	}

	get filters() {
		return this.#filters;
	}

	get title() {
		return this.#title;
	}

	get createdAt() {
		return this.#createdAt;
	}

	get updatedAt() {
		return this.#updatedAt;
	}

	persist() {
		try {
			localStorage.setItem(`${CHAT_STORAGE_PREFIX}${this.id}`, JSON.stringify(this));
		} catch (error) {
			alert(`Due to a problem, your chat history could not be saved.\n(Debug Information: ${error})`);
			return;
		}

		Chats.touch(this.id, {
			title: this.#title,
			createdAt: this.#createdAt,
			updatedAt: this.#updatedAt,
			preview: buildPreview(this.#messages[this.#messages.length - 1]?.content),
		});
	}

	addMessage(message: ChatMessage) {
		const shouldAutoTitle = message.role === "user" && !this.#hasUserMessage && this.#title === DEFAULT_CHAT_TITLE;
		this.#messages.push(message);
		if (message.role === "user") {
			this.#hasUserMessage = true;
		}
		if (shouldAutoTitle) {
			this.#title = deriveTitleFromMessage(message.content);
		}
		this.#updatedAt = Date.now();
		this.persist();
	}

	clear() {
		this.#messages = [];
		this.#hasUserMessage = false;
		this.#updatedAt = Date.now();
		this.persist();
	}

	setFilters(filters: ChatFilters) {
		this.#filters = { ...filters, allergens: [...filters.allergens], canteens: [...filters.canteens] };
		this.#updatedAt = Date.now();
		this.persist();
	}

	setTitle(title: string) {
		this.#title = normalizeTitle(title);
		this.#updatedAt = Date.now();
		this.persist();
	}

	touch() {
		this.#updatedAt = Date.now();
		this.persist();
	}

	delete() {
		Chats.deleteById(this.id);
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

		if (response.status === "needs_directions") {
			this.addMessage(
				new ChatMessage("assistant", response.prompt, {
					kind: "directions_prompt",
					toolCalls,
					directions: {
						lat: response.lat ?? undefined,
						lng: response.lng ?? undefined,
					},
				})
			);
			return response;
		}

		this.addMessage(new ChatMessage("assistant", response.reply, { kind: "normal", toolCalls }));
		return response;
	}

	toJSON() {
		return {
			id: this.id,
			title: this.#title,
			createdAt: this.#createdAt,
			updatedAt: this.#updatedAt,
			messages: this.#messages,
			filters: this.#filters,
		};
	}
}

export class Chats {
	private static listeners = new Set<() => void>();

	static subscribe(listener: () => void) {
		Chats.listeners.add(listener);
		return () => {
			Chats.listeners.delete(listener);
		};
	}

	private static notify() {
		Chats.listeners.forEach((listener) => {
			try {
				listener();
			} catch (error) {
				console.error("Error in chat listener:", error);
			}
		});
	}

	private static saveIndex(index: ChatIndex) {
		try {
			localStorage.setItem(CHAT_INDEX_KEY, JSON.stringify(index));
		} catch {
			// Ignore index persistence errors
		}
	}

	private static rebuildIndex(): ChatIndex {
		const index = makeChatIndex();
		const now = Date.now();
		const keys = Object.keys(localStorage).filter((key) => key.startsWith(CHAT_STORAGE_PREFIX));

		for (const key of keys) {
			const id = key.slice(CHAT_STORAGE_PREFIX.length);
			const raw = localStorage.getItem(key);
			if (!raw) continue;
			try {
				const parsed = JSON.parse(raw);
				const title = typeof parsed.title === "string" ? parsed.title : DEFAULT_CHAT_TITLE;
				const createdAt = typeof parsed.createdAt === "number" ? parsed.createdAt : now;
				const updatedAt = typeof parsed.updatedAt === "number" ? parsed.updatedAt : createdAt;
				const lastMessage = Array.isArray(parsed.messages)
					? parsed.messages[parsed.messages.length - 1]
					: undefined;
				index.byId[id] = {
					id,
					title: normalizeTitle(title),
					createdAt,
					updatedAt,
					preview: buildPreview(lastMessage?.content),
				};
			} catch {
				continue;
			}
		}

		index.order = Object.values(index.byId)
			.sort((a, b) => b.updatedAt - a.updatedAt)
			.map((entry) => entry.id);

		return index;
	}

	private static getIndex(): ChatIndex {
		try {
			const raw = localStorage.getItem(CHAT_INDEX_KEY);
			if (raw) {
				const parsed = JSON.parse(raw);
				if (
					parsed &&
					parsed.version === 1 &&
					Array.isArray(parsed.order) &&
					parsed.byId &&
					typeof parsed.byId === "object"
				) {
					return parsed as ChatIndex;
				}
			}
		} catch {
			// Ignore index parsing errors
		}

		const rebuilt = Chats.rebuildIndex();
		Chats.saveIndex(rebuilt);
		return rebuilt;
	}

	private static ensureIndexed(chat: Chat) {
		const index = Chats.getIndex();
		if (index.byId[chat.id]) return;
		index.byId[chat.id] = {
			id: chat.id,
			title: normalizeTitle(chat.title),
			createdAt: chat.createdAt,
			updatedAt: chat.updatedAt,
			preview: buildPreview(chat.messages[chat.messages.length - 1]?.content),
		};
		index.order = Object.values(index.byId)
			.sort((a, b) => b.updatedAt - a.updatedAt)
			.map((entry) => entry.id);
		Chats.saveIndex(index);
		Chats.notify();
	}

	private static generateId() {
		if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
			return crypto.randomUUID();
		}
		return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
	}

	static touch(id: string, updates: Partial<ChatSummary> = {}) {
		const index = Chats.getIndex();
		const existing = index.byId[id];
		const now = Date.now();
		const createdAt = updates.createdAt ?? existing?.createdAt ?? now;
		const updatedAt = updates.updatedAt ?? now;
		const title = normalizeTitle(updates.title ?? existing?.title ?? DEFAULT_CHAT_TITLE);
		const preview = updates.preview ?? existing?.preview ?? "";

		index.byId[id] = { id, title, createdAt, updatedAt, preview };
		index.order = [id, ...index.order.filter((entryId) => entryId !== id)];
		Chats.saveIndex(index);
		Chats.notify();
	}

	static listPage(offset = 0, limit = 10): ChatSummary[] {
		const index = Chats.getIndex();
		const slice = index.order.slice(offset, offset + limit);
		return slice.map((id) => index.byId[id]).filter(Boolean);
	}

	static getActiveId() {
		try {
			return localStorage.getItem(CHAT_ACTIVE_KEY);
		} catch {
			return null;
		}
	}

	static setActiveId(id: string) {
		try {
			localStorage.setItem(CHAT_ACTIVE_KEY, id);
		} catch {
			// Ignore persistence errors
		}
	}

	static create(options?: { title?: string }) {
		const id = Chats.generateId();
		const now = Date.now();
		const title = normalizeTitle(options?.title ?? DEFAULT_CHAT_TITLE);
		const chat = new Chat(id, [], defaultChatFilters, { title, createdAt: now, updatedAt: now });
		chat.persist();
		return chat;
	}

	static getById(id: string, createIfMissing = true) {
		const chatData = localStorage.getItem(`${CHAT_STORAGE_PREFIX}${id}`);
		if (chatData) {
			try {
				const parsed = JSON.parse(chatData);
				const filters = parsed.filters ?? defaultChatFilters;
				const messages = Array.isArray(parsed.messages)
					? parsed.messages.map((message: ChatMessageData) => ChatMessage.fromJSON(message))
					: [];
				const chat = new Chat(
					id,
					messages,
					{
						diet: filters.diet ?? defaultChatFilters.diet,
						allergens: Array.isArray(filters.allergens) ? filters.allergens : [],
						canteens: Array.isArray(filters.canteens) ? filters.canteens : [],
					},
					{
						title: typeof parsed.title === "string" ? parsed.title : DEFAULT_CHAT_TITLE,
						createdAt:
							typeof parsed.createdAt === "number"
								? parsed.createdAt
								: typeof parsed.updatedAt === "number"
									? parsed.updatedAt
									: Date.now(),
						updatedAt:
							typeof parsed.updatedAt === "number"
								? parsed.updatedAt
								: typeof parsed.createdAt === "number"
									? parsed.createdAt
									: Date.now(),
					}
				);
				Chats.ensureIndexed(chat);
				return chat;
			} catch (error) {
				alert(`Due to a problem, your chat history could not be restored.\n(Debug Information: ${error})`);
				const chat = new Chat(id, [], defaultChatFilters);
				chat.persist();
				return chat;
			}
		} else if (createIfMissing) {
			const chat = new Chat(id, [], defaultChatFilters);
			chat.persist();
			return chat;
		} else return undefined;
	}

	static listIds() {
		const index = Chats.getIndex();
		return [...index.order];
	}

	static exists(id: string) {
		return localStorage.getItem(`${CHAT_STORAGE_PREFIX}${id}`) !== null;
	}

	static clearById(id: string) {
		const chat = Chats.getById(id, false);
		if (!chat) return false;
		chat.clear();
		return true;
	}

	static deleteById(id: string) {
		try {
			localStorage.removeItem(`${CHAT_STORAGE_PREFIX}${id}`);
		} catch (error) {
			alert(`Due to a problem, the chat could not be deleted.\n(Debug Information: ${error})`);
		}

		const index = Chats.getIndex();
		if (index.byId[id]) {
			delete index.byId[id];
			index.order = index.order.filter((entryId) => entryId !== id);
			Chats.saveIndex(index);
			Chats.notify();
		}

		try {
			if (localStorage.getItem(CHAT_ACTIVE_KEY) === id) {
				localStorage.removeItem(CHAT_ACTIVE_KEY);
			}
		} catch {
			// Ignore cleanup errors
		}
	}

	static deleteAll() {
		let keys: string[] = [];
		try {
			keys = Object.keys(localStorage).filter((key) => key.startsWith(CHAT_STORAGE_PREFIX));
		} catch {
			// Ignore storage access errors
		}
		for (const key of keys) {
			try {
				localStorage.removeItem(key);
			} catch {
				// Ignore per-key deletion errors
			}
		}

		try {
			localStorage.removeItem(CHAT_INDEX_KEY);
			localStorage.removeItem(CHAT_ACTIVE_KEY);
		} catch {
			// Ignore cleanup errors
		}

		Chats.saveIndex(makeChatIndex());
		Chats.notify();
	}
}
