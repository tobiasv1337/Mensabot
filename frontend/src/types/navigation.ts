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

export const NAV_ROUTES: Record<NavItem, string> = {
    Home: "/",
    ChatBot: "/chat",
    Canteens: "/canteens",
    Map: "/map",
    ProjectFacts: "/about",
    LegalNotice: "/legal",
    Shortcuts: "/shortcuts",
    Settings: "/settings",
};

const PATH_TO_NAV: Record<string, NavItem> = Object.fromEntries(
    Object.entries(NAV_ROUTES).map(([k, v]) => [v, k as NavItem])
) as Record<string, NavItem>;

export const navItemFromPath = (pathname: string): NavItem =>
    PATH_TO_NAV[pathname] ?? "Home";
