import type { ChatFilters } from "../../services/chats";
import vegetarianIcon from "../../assets/vegetarian.svg";
import veganIcon from "../../assets/vegan.svg";
import meatIcon from "../../assets/meat.svg";

export const DIET_OPTIONS: Array<{
  value: Exclude<ChatFilters["diet"], null>;
  label: string;
  iconSrc: string;
}> = [
  {
    value: "vegetarian",
    label: "Vegetarisch",
    iconSrc: vegetarianIcon,
  },
  {
    value: "vegan",
    label: "Vegan",
    iconSrc: veganIcon,
  },
  {
    value: "meat",
    label: "Alles",
    iconSrc: meatIcon,
  },
];

export const ALLERGENS = [
  { key: "gluten", label: "Gluten" },
  { key: "wheat", label: "Weizen" },
  { key: "rye", label: "Roggen" },
  { key: "barley", label: "Gerste" },
  { key: "oats", label: "Hafer" },
  { key: "spelt", label: "Dinkel" },
  { key: "crustacean", label: "Krebstiere" },
  { key: "egg", label: "Eier" },
  { key: "fish", label: "Fisch" },
  { key: "peanut", label: "Erdnüsse" },
  { key: "soy", label: "Soja" },
  { key: "milk", label: "Milch" },
  { key: "lactose", label: "Laktose" },
  { key: "nut", label: "Schalenfrüchte" },
  { key: "celery", label: "Sellerie" },
  { key: "mustard", label: "Senf" },
  { key: "sesame", label: "Sesam" },
  { key: "sulfite", label: "Schwefeldioxid" },
  { key: "lupin", label: "Lupinen" },
  { key: "mollusc", label: "Weichtiere" },
  { key: "alcohol", label: "Alkohol" },
  { key: "caffeine", label: "Koffein" },
  { key: "quinine", label: "Chinin" },
  { key: "preservative", label: "Konservierungsstoffe" },
  { key: "nitrite", label: "Nitritpökelsalz" },
  { key: "antioxidant", label: "Antioxidationsmittel" },
  { key: "colorant", label: "Farbstoffe" },
  { key: "phosphate", label: "Phosphate" },
  { key: "sweetener", label: "Süßungsmittel" },
  { key: "flavor_enhancer", label: "Geschmacksverstärker" },
  { key: "gelatin", label: "Gelatine" },
  { key: "yeast", label: "Hefe" },
  { key: "phenylalanine", label: "Phenylalanin" },
  { key: "laxative", label: "Abführend" },
];

const ALLERGEN_LABELS = new Map(ALLERGENS.map((allergen) => [allergen.key, allergen.label]));
const ALLERGEN_KEY_BY_LABEL = new Map(ALLERGENS.map((allergen) => [allergen.label.toLowerCase(), allergen.key]));
const ALLERGEN_KEYS = new Set(ALLERGENS.map((allergen) => allergen.key));

export const normalizeAllergenKey = (value: string) => {
  const trimmed = value.trim();
  if (ALLERGEN_KEYS.has(trimmed)) return trimmed;
  const byLabel = ALLERGEN_KEY_BY_LABEL.get(trimmed.toLowerCase());
  return byLabel ?? trimmed;
};

export const normalizeAllergenList = (items: string[]) => {
  const seen = new Set<string>();
  const normalized: string[] = [];
  items.forEach((item) => {
    const key = normalizeAllergenKey(item);
    if (!seen.has(key)) {
      seen.add(key);
      normalized.push(key);
    }
  });
  return normalized;
};

export const getAllergenLabel = (key: string) => ALLERGEN_LABELS.get(key) ?? key;
