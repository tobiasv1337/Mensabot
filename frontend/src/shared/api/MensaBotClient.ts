/**
 * @file
 * This is the API client for `/backend/apps/api_backend/src/mensa_api_backend`.
 * You can work with it directly although it is advised to work with the
 * storage-integrated higher-level chat classes from `@/features/chat/model/chatStore.ts`.
 * 
 * With `Chat` and `Chats`, sending a message would look like the following:
 * ```tsx
 * const chat = Chats.getById("my-chat");
 * const response = await chat.send(client, "Hello");
 * console.log("Message History:", chat.messages);
 * ```
 * 
 * With the raw {@link MensaBotClient}, you would have to manage
 * storage and sessions yourself.
 */

import i18n from "@/app/i18n";
import { streamChatResponse, type ChatStreamEvent } from "@/features/chat/model/chatStream";
import type { ChatFilters, ChatRequestMessage } from "@/features/chat/model/chatTypes";
import type { ChatAnalyticsPayload } from "@/shared/analytics/requestMeta";

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

export type ClarificationSelectionMode = "single" | "multi";

export type ChatApiResponse =
	| { status: "ok"; reply: string; tool_calls?: ToolCallTrace[] }
	| { status: "needs_location"; prompt: string; tool_calls?: ToolCallTrace[] }
	| { status: "needs_directions"; prompt: string; lat?: number | null; lng?: number | null; tool_calls?: ToolCallTrace[] }
	| { status: "needs_clarification"; prompt: string; options: string[]; selection_mode?: ClarificationSelectionMode; allow_no_match?: boolean; tool_calls?: ToolCallTrace[] };

export type Canteen = {
	id: number;
	name: string;
	city?: string;
	address?: string;
	lat?: number | null;
	lng?: number | null;
};

export type OSMResolveStatus = "ok" | "ambiguous" | "not_found" | "error";

export type OSMAttribution = {
	attribution: string;
	attribution_url: string;
	license: string;
};

export type CanteenOpeningHoursResponse = {
	status: OSMResolveStatus;
	opening_hours?: string | null;
	kitchen_hours?: string | null;
	confidence: number;
	note?: string | null;
	attribution: OSMAttribution;
};

export type DietType = "vegan" | "vegetarian" | "meat" | "unknown";

export type MenuDietFilter = "all" | "meat_only" | "vegetarian" | "vegan";

export type PriceCategory = "students" | "employees" | "pupils" | "others";

export type PriceInfo = {
	students?: number | null;
	employees?: number | null;
	pupils?: number | null;
	others?: number | null;
};

export type Meal = {
	name: string;
	category?: string;
	prices: PriceInfo;
	diet_type: DietType;
	allergens: string[];
};

export type MenuStatus = "ok" | "no_menu_published" | "empty_menu" | "filtered_out" | "invalid_date" | "api_error";

export type MenuResponse = {
	canteen_id: number;
	date: string;
	status: MenuStatus;
	meals: Meal[];
	total_meals: number;
	returned_meals: number;
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
	total_cities: number;
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
	distance_km?: number | null;
};

export type CanteenSearchResponse = {
	results: CanteenSearchResult[];
	total_results: number;
	page_info: PageInfo;
	index: CanteenIndexInfo;
};

export type TranscribeResponse = {
	text: string;
	duration_s?: number;
};

export type ProjectStatsHeadline = {
	messages_total: number;
	users_total: number;
	active_users_30d: number;
	sessions_total: number;
	chats_total: number;
	tool_calls_total: number;
	transcribe_requests_total: number;
	shortcut_triggered_messages_total: number;
	distinct_canteens_total: number;
	distinct_cities_total: number;
	average_canteens_per_user: number;
	average_messages_per_session: number;
	tool_success_rate: number;
	average_tools_per_llm_turn: number;
};

export type ProjectStatsShare = {
	id: string;
	label: string;
	value: number;
};

export type ProjectStatsTrendPoint = {
	date: string;
	active_users: number;
	messages: number;
	llm_messages: number;
	quick_lookup_messages: number;
	interactions: number;
	sessions: number;
	shortcut_messages: number;
	tool_calls: number;
	transcribe_requests: number;
};

export type ProjectStatsHeatmapCell = {
	weekday: number;
	hour: number;
	count: number;
};

export type ProjectStatsLeaderboardEntry = {
	key: string;
	label: string;
	count: number;
	city?: string;
	id?: number;
};

export type ProjectStatsResponse = {
	updated_at: string;
	headline: ProjectStatsHeadline;
	availability: {
		total_canteens: number;
		total_cities: number;
	};
	shares: {
		interaction_types: ProjectStatsShare[];
		message_origins: ProjectStatsShare[];
		diet_filters: ProjectStatsShare[];
	};
	trend: {
		points: ProjectStatsTrendPoint[];
	};
	heatmap: ProjectStatsHeatmapCell[];
	leaderboards: {
		cities: ProjectStatsLeaderboardEntry[];
		canteens: ProjectStatsLeaderboardEntry[];
		tools: ProjectStatsLeaderboardEntry[];
		filters: ProjectStatsLeaderboardEntry[];
	};
};

type SendMessagesOptions = {
	includeToolCalls?: boolean;
	filters?: ChatFilters;
	judgeCorrection?: boolean;
	onStreamEvent?: (event: ChatStreamEvent) => void;
	onStreamFallback?: () => void;
	analytics?: ChatAnalyticsPayload;
};

type RequestOptions = {
	analyticsHeaders?: Record<string, string>;
};

export class MensaBotClient {
	private baseUrl: string;

	constructor(baseUrl: string) {
		this.baseUrl = baseUrl;
	}

	private buildChatRequestBody(messages: ChatRequestMessage[], options: SendMessagesOptions): Record<string, unknown> {
		const payload = messages.map((message) => ({ role: message.role, content: message.content }));

		const filters = options.filters;
		const hasFilters = filters && (filters.diet !== null || filters.allergens.length > 0 || filters.canteens.length > 0 || filters.priceCategory !== null);

		const body: Record<string, unknown> = {
			messages: payload,
			include_tool_calls: options.includeToolCalls ?? false,
			language: i18n.language,
			judgeCorrection: options.judgeCorrection ?? true,
		};

		if (hasFilters) {
			body.filters = {
				diet: filters.diet,
				allergens: filters.allergens,
				canteens: filters.canteens.map((c) => ({ id: c.id, name: c.name })),
				price_category: filters.priceCategory,
			};
		}

		if (options.analytics) {
			body.analytics = options.analytics;
		}

		return body;
	}

	private normalizeChatApiResponse(response: unknown): ChatApiResponse {
		const res = response as ChatApiResponse;
		if (res.status === "needs_location") {
			return { status: "needs_location", prompt: res.prompt, tool_calls: res.tool_calls };
		}

		if (res.status === "needs_directions") {
			return {
				status: "needs_directions",
				prompt: res.prompt,
				lat: res.lat,
				lng: res.lng,
				tool_calls: res.tool_calls,
			};
		}

		if (res.status === "needs_clarification") {
			return {
				status: "needs_clarification",
				prompt: res.prompt,
				options: res.options ?? [],
				selection_mode: res.selection_mode === "multi" ? "multi" : "single",
				allow_no_match: res.allow_no_match,
				tool_calls: res.tool_calls,
			};
		}

		if (res.status === "ok") {
			return { status: "ok", reply: res.reply, tool_calls: res.tool_calls };
		}

		throw new Error("Unexpected chat API response shape");
	}

	private async getJson(path: string, params?: URLSearchParams, options: RequestOptions = {}): Promise<unknown> {
		const queryString = params?.toString();
		const url = this.baseUrl + path + (queryString ? `?${queryString}` : "");

		const request = await fetch(url, {
			method: "GET",
			headers: {
				"Content-Type": "application/json",
				...(options.analyticsHeaders ?? {}),
			},
		});

		if (!request.ok) {
			throw new Error(`API error: ${request.status} ${request.statusText}`);
		}

		try {
			return await request.json();
		} catch {
			throw new Error("API returned invalid JSON");
		}
	}

	private async sendMessagesRest(body: Record<string, unknown>): Promise<ChatApiResponse> {
		const request = await fetch(this.baseUrl + "/chat", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(body)
		});

		if (!request.ok) {
			throw new Error(`Chat API error: ${request.status} ${request.statusText}`);
		}

		let response: unknown;
		try {
			response = await request.json();
		} catch {
			throw new Error("Chat API returned invalid JSON");
		}

		return this.normalizeChatApiResponse(response);
	}

	async sendMessages(messages: ChatRequestMessage[], options: SendMessagesOptions = {}): Promise<ChatApiResponse> {
		const body = this.buildChatRequestBody(messages, options);
		if (typeof WebSocket === "undefined") {
			return await this.sendMessagesRest(body);
		}
		return await streamChatResponse({
			baseUrl: this.baseUrl,
			body,
			fallback: () => this.sendMessagesRest(body),
			normalizeResponse: (response) => this.normalizeChatApiResponse(response),
			onEvent: options.onStreamEvent,
			onFallback: options.onStreamFallback,
		});
	}

	async transcribeAudio(audio: Blob): Promise<TranscribeResponse> {
		const request = await fetch(this.baseUrl + "/transcribe", {
			method: "POST",
			headers: {
				"Content-Type": audio.type || "application/octet-stream",
			},
			body: audio,
		});

		if (!request.ok) {
			let detail = "";
			try {
				const data = (await request.json()) as { detail?: string };
				if (typeof data?.detail === "string") detail = data.detail;
			} catch {
				// ignore
			}
			throw new Error(detail ? `Transcribe API error: ${detail}` : `Transcribe API error: ${request.status} ${request.statusText}`);
		}

		let response: unknown;
		try {
			response = await request.json();
		} catch {
			throw new Error("Transcribe API returned invalid JSON");
		}

		const res = response as Partial<TranscribeResponse>;
		if (typeof res.text === "string") {
			return { text: res.text, duration_s: typeof res.duration_s === "number" ? res.duration_s : undefined };
		}

		throw new Error("Unexpected transcribe API response shape");
	}

	async listCanteens(params: { page?: number; perPage?: number; city?: string; hasCoordinates?: boolean; } = {}): Promise<CanteenListResponse> {
		const searchParams = new URLSearchParams();
		if (params.page) searchParams.set("page", String(params.page));
		if (params.perPage) searchParams.set("per_page", String(params.perPage));
		if (params.city) searchParams.set("city", params.city);
		if (params.hasCoordinates !== undefined) searchParams.set("has_coordinates", String(params.hasCoordinates));

		const response = await this.getJson("/canteens", searchParams);
		return response as CanteenListResponse;
	}

	async searchCanteens(params: { query?: string; city?: string; nearLat?: number; nearLng?: number; radiusKm?: number; page?: number; perPage?: number; minScore?: number; hasCoordinates?: boolean; sortBy?: "auto" | "distance" | "name" | "city" } = {}): Promise<CanteenSearchResponse> {
		const searchParams = new URLSearchParams();
		if (params.query) searchParams.set("query", params.query);
		if (params.city) searchParams.set("city", params.city);
		if (params.nearLat !== undefined) searchParams.set("near_lat", String(params.nearLat));
		if (params.nearLng !== undefined) searchParams.set("near_lng", String(params.nearLng));
		if (params.radiusKm !== undefined) searchParams.set("radius_km", String(params.radiusKm));
		if (params.page !== undefined) searchParams.set("page", String(params.page));
		if (params.perPage !== undefined) searchParams.set("per_page", String(params.perPage));
		if (params.minScore !== undefined) searchParams.set("min_score", String(params.minScore));
		if (params.hasCoordinates !== undefined) searchParams.set("has_coordinates", String(params.hasCoordinates));
		if (params.sortBy) searchParams.set("sort_by", params.sortBy);

		const response = await this.getJson("/canteens/search", searchParams);
		return response as CanteenSearchResponse;
	}

	async getCanteenInfo(canteenId: number, options: RequestOptions = {}): Promise<Canteen> {
		const response = await this.getJson(`/canteens/${canteenId}`, undefined, options);
		return response as Canteen;
	}

	async getCanteenOpeningHours(canteenId: number, options: RequestOptions = {}): Promise<CanteenOpeningHoursResponse> {
		const response = await this.getJson(`/canteens/${canteenId}/opening-hours`, undefined, options);
		return response as CanteenOpeningHoursResponse;
	}

	async getCanteenMenu(
		canteenId: number,
		params: { date?: string; dietFilter?: MenuDietFilter; excludeAllergens?: string[]; priceCategory?: PriceCategory } = {},
		options: RequestOptions = {},
	): Promise<MenuResponse> {
		const searchParams = new URLSearchParams();
		if (params.date) searchParams.set("date", params.date);
		if (params.dietFilter) searchParams.set("diet_filter", params.dietFilter);
		if (params.excludeAllergens && params.excludeAllergens.length > 0) {
			params.excludeAllergens.forEach((item) => searchParams.append("exclude_allergens", item));
		}
		if (params.priceCategory) searchParams.set("price_category", params.priceCategory);

		const response = await this.getJson(`/canteens/${canteenId}/menu`, searchParams, options);
		return response as MenuResponse;
	}

	async getProjectStats(): Promise<ProjectStatsResponse> {
		const response = await this.getJson("/project-stats");
		return response as ProjectStatsResponse;
	}
}
