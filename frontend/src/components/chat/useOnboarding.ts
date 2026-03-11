import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChatMessage, type Chat as ChatModel, type ChatFilters, type DietPreference } from "../../services/chats";
import { isOnboardingCompleted, markOnboardingCompleted } from "../../services/onboarding";
import { DIET_OPTIONS, ALLERGENS } from "./filterData";
import type { MessageAction } from "./ChatBubble";

type OnboardingStep =
	| "idle"
	| "welcome"
	| "data_notice"
	| "diet_question"
	| "diet_select"
	| "allergy_question"
	| "allergy_select"
	| "hints"
	| "filter_disclaimer"
	| "complete"
	| "done";

type OnboardingState = {
	step: OnboardingStep;
	selectedDiet: DietPreference;
	selectedAllergens: string[];
};

export function useOnboarding(
	chat: ChatModel,
	onFiltersChange: (filters: ChatFilters) => void,
	onMessagesChanged: () => void,
) {
	const { t } = useTranslation();

	const [state, setState] = useState<OnboardingState>(() => ({
		step: isOnboardingCompleted() ? "done" : "idle",
		selectedDiet: null,
		selectedAllergens: [],
	}));

	// Reset state when chat changes
	useEffect(() => {
		setState({
			step: isOnboardingCompleted() ? "done" : "idle",
			selectedDiet: null,
			selectedAllergens: [],
		});
	}, [chat.id]);

	const addBotMessage = useCallback(
		(content: string) => {
			chat.addMessage(new ChatMessage("assistant", content, { kind: "onboarding" }));
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
		setState((s) => ({ ...s, step: "welcome" }));

		// Immediately advance to data notice after welcome
		setTimeout(() => {
			addBotMessage(t("chat.onboarding.dataNotice"));
			setState((s) => ({ ...s, step: "data_notice" }));
		}, 600);
	}, [chat.id, addBotMessage, t]);

	const advanceStep = useCallback(
		(action: string) => {
			switch (state.step) {
				case "data_notice": {
					if (action === "accept") {
						addBotMessage(t("chat.onboarding.dietQuestion"));
						setState((s) => ({ ...s, step: "diet_question" }));
					}
					break;
				}
				case "diet_question": {
					if (action === "yes") {
						addBotMessage(t("chat.onboarding.dietSelect"));
						setState((s) => ({ ...s, step: "diet_select" }));
					} else if (action === "no") {
						addBotMessage(t("chat.onboarding.noDietSelected"));
						setTimeout(() => {
							addBotMessage(t("chat.onboarding.allergyQuestion"));
							setState((s) => ({ ...s, step: "allergy_question" }));
						}, 400);
					}
					break;
				}
				case "diet_select": {
					if (action === "none") {
						addBotMessage(t("chat.onboarding.noDietSelected"));
						setTimeout(() => {
							addBotMessage(t("chat.onboarding.allergyQuestion"));
							setState((s) => ({ ...s, step: "allergy_question" }));
						}, 400);
						break;
					}
					// action is the diet value
					const diet = action as DietPreference;
					const label = DIET_OPTIONS.find((o) => o.value === diet)?.label ?? action;
					addBotMessage(t("chat.onboarding.dietSelected", { diet: label }));
					setState((s) => ({ ...s, selectedDiet: diet }));
					setTimeout(() => {
						addBotMessage(t("chat.onboarding.allergyQuestion"));
						setState((s) => ({ ...s, step: "allergy_question" }));
					}, 400);
					break;
				}
				case "allergy_question": {
					if (action === "yes") {
						addBotMessage(t("chat.onboarding.allergySelect"));
						setState((s) => ({ ...s, step: "allergy_select" }));
					} else if (action === "no") {
						addBotMessage(t("chat.onboarding.noAllergensSelected"));
						setTimeout(() => {
							addBotMessage(t("chat.onboarding.hints"));
							setState((s) => ({ ...s, step: "hints" }));
						}, 400);
					}
					break;
				}
				case "allergy_select": {
					if (action === "confirm") {
						const selected = state.selectedAllergens;
						if (selected.length > 0) {
							const labels = selected.map((k) => {
								const a = ALLERGENS.find((al) => al.key === k);
								return a ? a.label : k;
							});
							addBotMessage(t("chat.onboarding.allergensSelected", { allergens: labels.join(", ") }));
						} else {
							addBotMessage(t("chat.onboarding.noAllergensSelected"));
						}
						setTimeout(() => {
							addBotMessage(t("chat.onboarding.hints"));
							setState((s) => ({ ...s, step: "hints" }));
						}, 400);
					}
					break;
				}
				case "hints": {
					if (action === "ok") {
						addBotMessage(t("chat.onboarding.filterDisclaimer"));
						setState((s) => ({ ...s, step: "filter_disclaimer" }));
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
						});
						addBotMessage(t("chat.onboarding.complete"));
						markOnboardingCompleted();
						setState((s) => ({ ...s, step: "complete" }));
						setTimeout(() => {
							setState((s) => ({ ...s, step: "done" }));
						}, 800);
					}
					break;
				}
				default:
					break;
			}
		},
		[state, addBotMessage, t, onFiltersChange],
	);

	const toggleAllergen = useCallback((key: string) => {
		setState((s) => {
			const has = s.selectedAllergens.includes(key);
			return {
				...s,
				selectedAllergens: has
					? s.selectedAllergens.filter((k) => k !== key)
					: [...s.selectedAllergens, key],
			};
		});
	}, []);

	const isActive = state.step !== "done" && state.step !== "idle";

	const getActions = useCallback(
		(messageIndex: number, totalMessages: number): MessageAction[] => {
			// Only show actions on the last message
			if (messageIndex !== totalMessages - 1) return [];

			switch (state.step) {
				case "data_notice":
					return [
						{ id: "accept", label: t("chat.onboarding.dataAccept"), onClick: () => advanceStep("accept") },
					];
				case "diet_question":
					return [
						{ id: "yes", label: t("chat.onboarding.dietYes"), onClick: () => advanceStep("yes") },
						{ id: "no", label: t("chat.onboarding.dietNo"), onClick: () => advanceStep("no"), variant: "secondary" },
					];
				case "diet_select":
					return [
						...DIET_OPTIONS.map((opt) => ({
							id: `diet-${opt.value}`,
							label: opt.label,
							onClick: () => advanceStep(opt.value),
						})),
						{ id: "diet-none", label: t("chat.onboarding.dietNo"), onClick: () => advanceStep("none"), variant: "secondary" as const },
					];
				case "allergy_question":
					return [
						{ id: "yes", label: t("chat.onboarding.allergyYes"), onClick: () => advanceStep("yes") },
						{ id: "no", label: t("chat.onboarding.allergyNo"), onClick: () => advanceStep("no"), variant: "secondary" },
					];
				case "allergy_select":
					return [
						...ALLERGENS.map((a) => ({
							id: `allergen-${a.key}`,
							label: state.selectedAllergens.includes(a.key) ? `✓ ${a.label}` : a.label,
							onClick: () => toggleAllergen(a.key),
							variant: (state.selectedAllergens.includes(a.key) ? "primary" : "secondary") as "primary" | "secondary",
						})),
						{ id: "confirm", label: t("chat.onboarding.allergyConfirm"), onClick: () => advanceStep("confirm") },
					];
				case "hints":
					return [
						{ id: "ok", label: "OK", onClick: () => advanceStep("ok") },
					];
				case "filter_disclaimer":
					return [
						{ id: "accept", label: t("chat.onboarding.filterDisclaimerAccept"), onClick: () => advanceStep("accept") },
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
