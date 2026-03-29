import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChatMessage, type Chat as ChatModel, type ChatFilters, type DietPreference, type PriceCategory } from "../../../services/chats";
import { isOnboardingCompleted, markOnboardingCompleted } from "../../../services/onboarding";
import { DIET_OPTIONS, ALLERGENS, PRICE_CATEGORY_OPTIONS } from "../../../components/chat/filterData";
import type { MessageAction } from "../../../components/chat/ChatBubble";

type OnboardingStep =
	| "idle"
	| "welcome"
	| "transition"
	| "data_notice"
	| "price_category_select"
	| "diet_question"
	| "diet_select"
	| "allergy_question"
	| "allergy_select"
	| "hints"
	| "quick_access_hint"
	| "filter_disclaimer"
	| "complete"
	| "done";

type OnboardingState = {
	step: OnboardingStep;
	selectedPriceCategory: PriceCategory;
	selectedDiet: DietPreference;
	selectedAllergens: string[];
};

type OnboardingStateMap = Record<string, OnboardingState>;

const INITIAL_ONBOARDING_DELAY_MS = 2000;
const FOLLOW_UP_QUESTION_DELAY_MS = 1000;

const createInitialOnboardingState = (): OnboardingState => ({
	step: isOnboardingCompleted() ? "done" : "idle",
	selectedPriceCategory: null,
	selectedDiet: null,
	selectedAllergens: [],
});

export function useChatOnboarding(
	chat: ChatModel,
	onFiltersChange: (filters: ChatFilters) => void,
	onMessagesChanged: () => void,
) {
	const { t } = useTranslation();

	const [stateByChatId, setStateByChatId] = useState<OnboardingStateMap>(() => ({
		[chat.id]: createInitialOnboardingState(),
	}));
	const state = stateByChatId[chat.id] ?? createInitialOnboardingState();

	// Track pending timeouts so we can cancel them on unmount / chat switch
	const pendingTimeouts = useRef<ReturnType<typeof setTimeout>[]>([]);
	const prevChatIdRef = useRef(chat.id);

	const scheduledTimeout = useCallback((fn: () => void, ms: number) => {
		const id = setTimeout(fn, ms);
		pendingTimeouts.current.push(id);
		return id;
	}, []);

	const updateState = useCallback(
		(updater: OnboardingState | ((current: OnboardingState) => OnboardingState)) => {
			setStateByChatId((prev) => {
				const current = prev[chat.id] ?? createInitialOnboardingState();
				const next = typeof updater === "function"
					? (updater as (current: OnboardingState) => OnboardingState)(current)
					: updater;
				return { ...prev, [chat.id]: next };
			});
		},
		[chat.id],
	);

	useEffect(() => {
		if (prevChatIdRef.current !== chat.id) {
			prevChatIdRef.current = chat.id;
			pendingTimeouts.current.forEach(clearTimeout);
			pendingTimeouts.current = [];
		}
	}, [chat.id]);

	useEffect(
		() => () => {
			pendingTimeouts.current.forEach(clearTimeout);
			pendingTimeouts.current = [];
		},
		[],
	);

	const addBotMessage = useCallback(
		(content: string) => {
			chat.addMessage(new ChatMessage("assistant", content, { kind: "onboarding" }));
			onMessagesChanged();
		},
		[chat, onMessagesChanged],
	);

	const addUserMessage = useCallback(
		(content: string) => {
			chat.addMessage(new ChatMessage("user", content, { kind: "onboarding" }));
			onMessagesChanged();
		},
		[chat, onMessagesChanged],
	);

	// Track which chat.id onboarding was already started for to prevent
	// StrictMode double-firing from adding the welcome message twice.
	const startedForChatRef = useRef<string | null>(null);

	const startOnboarding = useCallback(() => {
		if (startedForChatRef.current === chat.id) return;
		startedForChatRef.current = chat.id;

		addBotMessage(t("chat.onboarding.welcome"));
		updateState((s) => ({ ...s, step: "welcome" }));

		// Immediately advance to data notice after welcome
		scheduledTimeout(() => {
			addBotMessage(t("chat.onboarding.dataNotice"));
			updateState((s) => ({ ...s, step: "data_notice" }));
		}, INITIAL_ONBOARDING_DELAY_MS);
	}, [chat.id, addBotMessage, scheduledTimeout, t, updateState]);

	const advanceStep = useCallback(
		(action: string, label?: string) => {
			if (label) {
				addUserMessage(label);
			}
				switch (state.step) {
					case "data_notice": {
						if (action === "accept") {
							updateState((s) => ({ ...s, step: "transition" }));
							scheduledTimeout(() => {
								addBotMessage(t("chat.onboarding.priceCategorySelect"));
								updateState((s) => ({ ...s, step: "price_category_select" }));
							}, FOLLOW_UP_QUESTION_DELAY_MS);
						}
						break;
					}
					case "price_category_select": {
						if (action === "none") {
							updateState((s) => ({ ...s, step: "transition" }));
							scheduledTimeout(() => {
								addBotMessage(t("chat.onboarding.dietQuestion"));
								updateState((s) => ({ ...s, step: "diet_question" }));
							}, FOLLOW_UP_QUESTION_DELAY_MS);
							break;
						}
						// action is the price category value
						const category = action as PriceCategory;
						updateState((s) => ({ ...s, selectedPriceCategory: category, step: "transition" }));
						scheduledTimeout(() => {
							addBotMessage(t("chat.onboarding.dietQuestion"));
							updateState((s) => ({ ...s, step: "diet_question" }));
						}, FOLLOW_UP_QUESTION_DELAY_MS);
						break;
					}
					case "diet_question": {
						if (action === "yes") {
							updateState((s) => ({ ...s, step: "transition" }));
							scheduledTimeout(() => {
								addBotMessage(t("chat.onboarding.dietSelect"));
								updateState((s) => ({ ...s, step: "diet_select" }));
							}, FOLLOW_UP_QUESTION_DELAY_MS);
						} else if (action === "no") {
							updateState((s) => ({ ...s, step: "transition" }));
							scheduledTimeout(() => {
								addBotMessage(t("chat.onboarding.allergyQuestion"));
								updateState((s) => ({ ...s, step: "allergy_question" }));
							}, FOLLOW_UP_QUESTION_DELAY_MS);
						}
						break;
					}
					case "diet_select": {
						if (action === "none") {
							updateState((s) => ({ ...s, step: "transition" }));
							scheduledTimeout(() => {
								addBotMessage(t("chat.onboarding.allergyQuestion"));
								updateState((s) => ({ ...s, step: "allergy_question" }));
							}, FOLLOW_UP_QUESTION_DELAY_MS);
							break;
						}
						// action is the diet value
						const diet = action as DietPreference;
						updateState((s) => ({ ...s, selectedDiet: diet, step: "transition" }));
						scheduledTimeout(() => {
							addBotMessage(t("chat.onboarding.allergyQuestion"));
							updateState((s) => ({ ...s, step: "allergy_question" }));
						}, FOLLOW_UP_QUESTION_DELAY_MS);
						break;
					}
					case "allergy_question": {
						if (action === "yes") {
							updateState((s) => ({ ...s, step: "transition" }));
							scheduledTimeout(() => {
								addBotMessage(t("chat.onboarding.allergySelect"));
								updateState((s) => ({ ...s, step: "allergy_select" }));
							}, FOLLOW_UP_QUESTION_DELAY_MS);
						} else if (action === "no") {
							updateState((s) => ({ ...s, step: "transition" }));
							scheduledTimeout(() => {
								addBotMessage(t("chat.onboarding.hints"));
								updateState((s) => ({ ...s, step: "hints" }));
							}, FOLLOW_UP_QUESTION_DELAY_MS);
						}
						break;
					}
					case "allergy_select": {
						if (action === "confirm") {
							updateState((s) => ({ ...s, step: "transition" }));
							scheduledTimeout(() => {
								addBotMessage(t("chat.onboarding.hints"));
								updateState((s) => ({ ...s, step: "hints" }));
							}, FOLLOW_UP_QUESTION_DELAY_MS);
						}
						break;
					}
					case "hints": {
						if (action === "ok") {
							updateState((s) => ({ ...s, step: "transition" }));
							scheduledTimeout(() => {
								addBotMessage(t("chat.onboarding.quickAccessHint"));
								updateState((s) => ({ ...s, step: "quick_access_hint" }));
							}, FOLLOW_UP_QUESTION_DELAY_MS);
						}
						break;
					}
					case "quick_access_hint": {
						if (action === "ok") {
							updateState((s) => ({ ...s, step: "transition" }));
							scheduledTimeout(() => {
								addBotMessage(t("chat.onboarding.filterDisclaimer"));
								updateState((s) => ({ ...s, step: "filter_disclaimer" }));
							}, FOLLOW_UP_QUESTION_DELAY_MS);
						}
						break;
					}
					case "filter_disclaimer": {
					if (action === "accept") {
						// Apply filters
						onFiltersChange({
							diet: state.selectedDiet,
								allergens: [...state.selectedAllergens],
								canteens: [],
								priceCategory: state.selectedPriceCategory,
							});
							updateState((s) => ({ ...s, step: "transition" }));
							scheduledTimeout(() => {
								addBotMessage(t("chat.onboarding.complete"));
								markOnboardingCompleted();
								updateState((s) => ({ ...s, step: "complete" }));
								scheduledTimeout(() => {
									updateState((s) => ({ ...s, step: "done" }));
								}, 800);
							}, FOLLOW_UP_QUESTION_DELAY_MS);
						}
						break;
				}
				default:
					break;
			}
		},
			[state, addBotMessage, addUserMessage, scheduledTimeout, t, onFiltersChange, updateState],
		);

	const toggleAllergen = useCallback((key: string) => {
		updateState((s) => {
			const has = s.selectedAllergens.includes(key);
			return {
				...s,
				selectedAllergens: has
					? s.selectedAllergens.filter((k) => k !== key)
					: [...s.selectedAllergens, key],
			};
		});
	}, [updateState]);

	const isActive = state.step !== "done" && state.step !== "idle";

	const getActions = useCallback(
		(messageIndex: number, totalMessages: number): MessageAction[] => {
			// Only show actions on the last message
			if (messageIndex !== totalMessages - 1) return [];

			switch (state.step) {
				case "data_notice":
					return [
						{ id: "accept", label: t("chat.onboarding.dataAccept"), onClick: () => advanceStep("accept", t("chat.onboarding.dataAccept")) },
					];
				case "price_category_select":
					return [
						...PRICE_CATEGORY_OPTIONS.map((opt) => ({
							id: `price-${opt.value}`,
							label: opt.label,
							onClick: () => advanceStep(opt.value, opt.label),
						})),
						{ id: "price-none", label: t("chat.onboarding.priceCategoryNo"), onClick: () => advanceStep("none", t("chat.onboarding.priceCategoryNo")), variant: "secondary" as const },
					];
				case "diet_question":
					return [
						{ id: "yes", label: t("chat.onboarding.dietYes"), onClick: () => advanceStep("yes", t("chat.onboarding.dietYes")) },
						{ id: "no", label: t("chat.onboarding.dietNo"), onClick: () => advanceStep("no", t("chat.onboarding.dietNo")), variant: "secondary" },
					];
				case "diet_select":
					return [
						...DIET_OPTIONS.map((opt) => ({
							id: `diet-${opt.value}`,
							label: opt.label,
							onClick: () => advanceStep(opt.value, opt.label),
						})),
						{ id: "diet-none", label: t("chat.onboarding.dietNo"), onClick: () => advanceStep("none", t("chat.onboarding.dietNo")), variant: "secondary" as const },
					];
				case "allergy_question":
					return [
						{ id: "yes", label: t("chat.onboarding.allergyYes"), onClick: () => advanceStep("yes", t("chat.onboarding.allergyYes")) },
						{ id: "no", label: t("chat.onboarding.allergyNo"), onClick: () => advanceStep("no", t("chat.onboarding.allergyNo")), variant: "secondary" },
					];
				case "allergy_select":
					return [
						...ALLERGENS.map((a) => ({
							id: `allergen-${a.key}`,
							label: state.selectedAllergens.includes(a.key) ? `✓ ${a.label}` : a.label,
							onClick: () => toggleAllergen(a.key),
							variant: (state.selectedAllergens.includes(a.key) ? "primary" : "secondary") as "primary" | "secondary",
						})),
						{ id: "confirm", label: t("chat.onboarding.allergyConfirm"), onClick: () => advanceStep("confirm", t("chat.onboarding.allergyConfirm")) },
					];
				case "hints":
				case "quick_access_hint":
					return [
						{ id: "ok", label: t("chat.onboarding.hintsOk"), onClick: () => advanceStep("ok", t("chat.onboarding.hintsOk")) },
					];
				case "filter_disclaimer":
					return [
						{ id: "accept", label: t("chat.onboarding.filterDisclaimerAccept"), onClick: () => advanceStep("accept", t("chat.onboarding.filterDisclaimerAccept")) },
					];
				default:
					return [];
			}
		},
		[state, advanceStep, toggleAllergen, t],
	);

	return {
		isActive,
		step: state.step,
		startOnboarding,
		getActions,
		selectedAllergens: state.selectedAllergens,
	};
}
