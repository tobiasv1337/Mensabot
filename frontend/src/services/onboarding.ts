const ONBOARDING_KEY = "mensabot-onboarding-completed";

export function isOnboardingCompleted(): boolean {
	try {
		return localStorage.getItem(ONBOARDING_KEY) === "true";
	} catch {
		return false;
	}
}

export function markOnboardingCompleted(): void {
	try {
		localStorage.setItem(ONBOARDING_KEY, "true");
	} catch {
		// Ignore persistence errors
	}
}

export function resetOnboarding(): void {
	try {
		localStorage.removeItem(ONBOARDING_KEY);
	} catch {
		// Ignore persistence errors
	}
}
