export type NavItem =
    | "Home"
    | "ChatBot"
    | "Canteens"
    | "Map"
    | "ProjectFacts"
    | "About"
    | "LegalNotice"
    | "Shortcuts"
    | "Settings";

export const NAV_LABELS: Record<NavItem, string> = {
    Home: "Home",
    ChatBot: "Chatbot",
    Canteens: "Mensen",
    About: "Über Uns",
    LegalNotice: "Impressum",
    Shortcuts: "Shortcuts",
    Settings: "Einstellungen",
    Map: "Karte",
    ProjectFacts: "Projekt Fakten",
};
