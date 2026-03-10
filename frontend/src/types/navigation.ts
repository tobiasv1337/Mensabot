import type { TFunction } from "i18next";

export type NavItem =
    | "Home"
    | "ChatBot"
    | "Canteens"
    | "Map"
    | "ProjectFacts"
    | "LegalNotice"
    | "Shortcuts"
    | "Settings";

const NAV_LABEL_KEYS: Record<NavItem, string> = {
    Home: "nav.home",
    ChatBot: "nav.chatbot",
    Canteens: "nav.canteens",
    LegalNotice: "nav.legalNotice",
    Shortcuts: "nav.shortcuts",
    Settings: "nav.settings",
    Map: "nav.map",
    ProjectFacts: "nav.projectFacts",
};

export const getNavLabel = (item: NavItem, t: TFunction): string =>
    t(NAV_LABEL_KEYS[item] ?? item);
