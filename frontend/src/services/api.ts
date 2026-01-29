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
import type { Allergen, Diet } from "./preferences";

export type ToolCallTrace = {
	id?: string;
	name: string;
	args?: Record<string, unknown>;
	raw_args?: string;
	result?: unknown;
	ok?: boolean;
	error?: string;
	iteration?: number;
};

export type ChatApiResponse =
	| { status: "ok"; reply: string; tool_calls?: ToolCallTrace[] }
	| { status: "needs_location"; prompt: string; tool_calls?: ToolCallTrace[] };

export type Canteen = {
	id: number;
	name: string;
	city?: string;
	address?: string;
	lat?: number;
	lng?: number;
};

export type PageInfo = {
	current_page: number;
	per_page: number;
	next_page?: number;
	has_next: boolean;
};

export type CanteenIndexInfo = {
	updated_at: string;
	total_canteens: number;
};

export type CanteenListResponse = {
	canteens: Canteen[];
	page_info: PageInfo;
	index: CanteenIndexInfo;
	total_results: number;
};

export type CanteenSearchResult = {
	canteen: Canteen;
	score: number;
	distance_km?: number;
};

export type CanteenSearchResponse = {
	results: CanteenSearchResult[];
	total_results: number;
	index: CanteenIndexInfo;
};

export class MensaBotClient {
	private baseUrl: string;

	constructor(baseUrl: string) {
		this.baseUrl = baseUrl;
	}

	private async getJson(path: string): Promise<unknown> {
		const request = await fetch(this.baseUrl + path, {
			method: "GET",
			headers: {
				"Content-Type": "application/json",
			},
		});

		if (!request.ok) {
			throw new Error(`API error: ${request.status} ${request.statusText}`);
		}

		try {
			return await request.json();
		} catch (err) {
			throw new Error("API returned invalid JSON");
		}
	}

	async sendMessages(messages: ChatMessage[], diet: Diet, allergens: Allergen[], options: { includeToolCalls?: boolean } = {}): Promise<ChatApiResponse> {
		const payload = messages.map((message) => ({ role: message.role, content: message.content }));
		const request = await fetch(this.baseUrl + "/api/chat", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				messages: payload,
				diet,
				allergens,
				include_tool_calls: options.includeToolCalls ?? false,
			})
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
			return { status: "needs_location", prompt: res.prompt, tool_calls: res.tool_calls };
		}

		if (res.status === "ok") {
			return { status: "ok", reply: res.reply, tool_calls: res.tool_calls };
		}

		throw new Error("Unexpected chat API response shape");
	}

	async listCanteens(params: {page?: number; perPage?: number; city?: string; hasCoordinates?: boolean;} = {}): Promise<CanteenListResponse> {
		const url = new URL(this.baseUrl + "/api/canteens");
		if (params.page) url.searchParams.set("page", String(params.page));
		if (params.perPage) url.searchParams.set("per_page", String(params.perPage));
		if (params.city) url.searchParams.set("city", params.city);
		if (params.hasCoordinates !== undefined) url.searchParams.set("has_coordinates", String(params.hasCoordinates));

		const response = await this.getJson(url.pathname + url.search);
		return response as CanteenListResponse;
	}

	async searchCanteens(params: {query?: string; city?: string; nearLat?: number; nearLng?: number; radiusKm?: number; limit?: number; minScore?: number; hasCoordinates?: boolean;} = {}): Promise<CanteenSearchResponse> {
		const url = new URL(this.baseUrl + "/api/canteens/search");
		if (params.query) url.searchParams.set("query", params.query);
		if (params.city) url.searchParams.set("city", params.city);
		if (params.nearLat !== undefined) url.searchParams.set("near_lat", String(params.nearLat));
		if (params.nearLng !== undefined) url.searchParams.set("near_lng", String(params.nearLng));
		if (params.radiusKm !== undefined) url.searchParams.set("radius_km", String(params.radiusKm));
		if (params.limit !== undefined) url.searchParams.set("limit", String(params.limit));
		if (params.minScore !== undefined) url.searchParams.set("min_score", String(params.minScore));
		if (params.hasCoordinates !== undefined) url.searchParams.set("has_coordinates", String(params.hasCoordinates));

		const response = await this.getJson(url.pathname + url.search);
		return response as CanteenSearchResponse;
	}
}
