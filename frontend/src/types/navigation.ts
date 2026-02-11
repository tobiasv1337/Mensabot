export type NavItem =
    | "Home"
    | "ChatBot"
    | "Canteens"
    | "Map"
    | "ProjectFacts"
    | "About"
    | "Contact"
    | "Shortcuts"
    | "Settings";

export const NAV_LABELS: Record<NavItem, string> = {
    Home: "Home",
    ChatBot: "Chatbot",
    Canteens: "Mensen",
    About: "Über Uns",
    Contact: "Kontakt",
    Shortcuts: "Shortcuts",
    Settings: "Einstellungen",
    Map: "Karte",
    ProjectFacts: "Projekt Fakten",
};
