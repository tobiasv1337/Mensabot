import type { Canteen, ClarificationSelectionMode, ToolCallTrace } from "@/shared/api/MensaBotClient";

export type MessageKind = "normal" | "location_prompt" | "directions_prompt" | "clarification_prompt" | "onboarding";

export type DirectionsMeta = {
  lat?: number;
  lng?: number;
};

export type ClarificationMeta = { options: string[]; selection_mode?: ClarificationSelectionMode; allow_no_match?: boolean };

export type ChatRequestMessage = {
  role: "user" | "assistant";
  content: string;
};

export type ChatMessageData = ChatRequestMessage & {
  meta: {
    kind: MessageKind;
    toolCalls?: ToolCallTrace[];
    directions?: DirectionsMeta;
    clarification?: ClarificationMeta;
  };
};

export type DietPreference = "vegetarian" | "vegan" | "meat" | null;

export type PriceCategory = "students" | "employees" | "pupils" | "others" | null;

export type ChatFilters = {
  diet: DietPreference;
  allergens: string[];
  canteens: Canteen[];
  priceCategory: PriceCategory;
};

export type ChatSummary = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  preview?: string;
};

export const defaultChatFilters: ChatFilters = {
  diet: null,
  allergens: [],
  canteens: [],
  priceCategory: null,
};
