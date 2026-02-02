import type { Canteen, MenuResponse, PriceInfo } from "../../services/api";

const PRICE_FORMATTER = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
});

const formatPrice = (value?: number | null) => {
  if (value === null || value === undefined) return null;
  return PRICE_FORMATTER.format(value);
};

const formatPriceCompact = (prices: PriceInfo) => {
  const values = [prices.students, prices.employees, prices.pupils, prices.others]
    .map((price) => formatPrice(price))
    .filter((value): value is string => Boolean(value));

  return values.length > 0 ? ` (${values.join(", ")})` : "";
};

const DIET_SYMBOLS: Record<string, string> = {
  vegan: "🌱",
  vegetarian: "🥕",
  meat: "🥩",
  fish: "🐟",
  unknown: "🍽️",
};

const WEEKDAY_LABELS = [
  "Sonntag",
  "Montag",
  "Dienstag",
  "Mittwoch",
  "Donnerstag",
  "Freitag",
  "Samstag",
];

const formatGermanMenuDate = (isoDate?: string) => {
  if (!isoDate) return "";
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return isoDate;
  }
  const weekday = WEEKDAY_LABELS[date.getDay()];
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${weekday}, ${day}.${month}.${year}`;
};

type MenuMeal = MenuResponse["meals"][number];

const groupMealsByCategory = (meals: MenuMeal[]) => {
  const groups = new Map<string, MenuMeal[]>();
  meals.forEach((meal) => {
    const key = meal.category?.trim() || "Weitere Gerichte";
    const existing = groups.get(key);
    if (existing) {
      existing.push(meal);
    } else {
      groups.set(key, [meal]);
    }
  });
  return Array.from(groups.entries());
};

export const buildMenuMarkdown = (canteen: Canteen, menu: MenuResponse) => {
  const lines: string[] = [`### ${canteen.name}`];
  const metaParts = [canteen.city, canteen.address].filter(Boolean);
  if (metaParts.length > 0) {
    lines.push(`_${metaParts.join(" · ")}_`);
  }
  const formattedDate = formatGermanMenuDate(menu.date) || menu.date;
  lines.push(`Speiseplan für **${formattedDate}**`);
  lines.push("");

  if (menu.status !== "ok") {
    const statusMessages: Record<MenuResponse["status"], string> = {
      ok: "",
      no_menu_published: "Für dieses Datum ist noch kein Speiseplan veröffentlicht.",
      empty_menu: "Für dieses Datum sind keine Gerichte eingetragen.",
      filtered_out: "Alle Gerichte wurden durch Filter ausgeschlossen.",
      invalid_date: "Das Datum ist ungültig.",
      api_error: "Der Speiseplan konnte gerade nicht geladen werden.",
    };
    const severity = menu.status === "api_error" || menu.status === "invalid_date" ? "⚠️" : "ℹ️";
    lines.push(`> ${severity} **Info:** ${statusMessages[menu.status]}`);
    return lines.join("\n");
  }

  if (menu.meals.length === 0) {
    lines.push("> ℹ️ **Info:** Für dieses Datum sind keine Gerichte eingetragen.");
    return lines.join("\n");
  }

  const grouped = groupMealsByCategory(menu.meals);
  grouped.forEach(([category, meals], groupIndex) => {
    if (groupIndex > 0) lines.push("");
    lines.push(`#### ${category}`);
    meals.forEach((meal) => {
      const dietSymbol = DIET_SYMBOLS[meal.diet_type] ?? "🍽️";
      const priceSuffix = formatPriceCompact(meal.prices);
      lines.push(`- ${dietSymbol} **${meal.name}**${priceSuffix}`);
    });
  });

  return lines.join("\n");
};
