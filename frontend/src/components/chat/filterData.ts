import i18n from "../../i18n";
import type { ChatFilters } from "../../services/chats";
import vegetarianIcon from "../../assets/vegetarian.svg";
import veganIcon from "../../assets/vegan.svg";
import meatIcon from "../../assets/meat.svg";

/**
 * Diet options - `value` is the API key (never translated),
 * `label` is a getter that resolves the display name via i18n at call time.
 */
export const DIET_OPTIONS: ReadonlyArray<{
  value: Exclude<ChatFilters["diet"], null>;
  label: string;
  iconSrc: string;
}> = [
    {
      value: "vegetarian",
      get label() { return i18n.t("chat.dietOptions.vegetarian"); },
      iconSrc: vegetarianIcon,
    },
    {
      value: "vegan",
      get label() { return i18n.t("chat.dietOptions.vegan"); },
      iconSrc: veganIcon,
    },
    {
      value: "meat",
      get label() { return i18n.t("chat.dietOptions.meat"); },
      iconSrc: meatIcon,
    },
  ];

/**
 * Allergen definitions - `key` is the API identifier (never translated),
 * `label` is resolved via i18n at access time.
 */
export const ALLERGENS: ReadonlyArray<{ key: string; label: string }> = [
  { key: "gluten", get label() { return i18n.t("chat.allergenLabels.gluten"); } },
  { key: "wheat", get label() { return i18n.t("chat.allergenLabels.wheat"); } },
  { key: "rye", get label() { return i18n.t("chat.allergenLabels.rye"); } },
  { key: "barley", get label() { return i18n.t("chat.allergenLabels.barley"); } },
  { key: "oats", get label() { return i18n.t("chat.allergenLabels.oats"); } },
  { key: "spelt", get label() { return i18n.t("chat.allergenLabels.spelt"); } },
  { key: "crustacean", get label() { return i18n.t("chat.allergenLabels.crustacean"); } },
  { key: "egg", get label() { return i18n.t("chat.allergenLabels.egg"); } },
  { key: "fish", get label() { return i18n.t("chat.allergenLabels.fish"); } },
  { key: "peanut", get label() { return i18n.t("chat.allergenLabels.peanut"); } },
  { key: "soy", get label() { return i18n.t("chat.allergenLabels.soy"); } },
  { key: "milk", get label() { return i18n.t("chat.allergenLabels.milk"); } },
  { key: "lactose", get label() { return i18n.t("chat.allergenLabels.lactose"); } },
  { key: "nut", get label() { return i18n.t("chat.allergenLabels.nut"); } },
  { key: "celery", get label() { return i18n.t("chat.allergenLabels.celery"); } },
  { key: "mustard", get label() { return i18n.t("chat.allergenLabels.mustard"); } },
  { key: "sesame", get label() { return i18n.t("chat.allergenLabels.sesame"); } },
  { key: "sulfite", get label() { return i18n.t("chat.allergenLabels.sulfite"); } },
  { key: "lupin", get label() { return i18n.t("chat.allergenLabels.lupin"); } },
  { key: "mollusc", get label() { return i18n.t("chat.allergenLabels.mollusc"); } },
  { key: "alcohol", get label() { return i18n.t("chat.allergenLabels.alcohol"); } },
  { key: "caffeine", get label() { return i18n.t("chat.allergenLabels.caffeine"); } },
  { key: "quinine", get label() { return i18n.t("chat.allergenLabels.quinine"); } },
  { key: "preservative", get label() { return i18n.t("chat.allergenLabels.preservative"); } },
  { key: "nitrite", get label() { return i18n.t("chat.allergenLabels.nitrite"); } },
  { key: "antioxidant", get label() { return i18n.t("chat.allergenLabels.antioxidant"); } },
  { key: "colorant", get label() { return i18n.t("chat.allergenLabels.colorant"); } },
  { key: "phosphate", get label() { return i18n.t("chat.allergenLabels.phosphate"); } },
  { key: "sweetener", get label() { return i18n.t("chat.allergenLabels.sweetener"); } },
  { key: "flavor_enhancer", get label() { return i18n.t("chat.allergenLabels.flavor_enhancer"); } },
  { key: "gelatin", get label() { return i18n.t("chat.allergenLabels.gelatin"); } },
  { key: "yeast", get label() { return i18n.t("chat.allergenLabels.yeast"); } },
  { key: "phenylalanine", get label() { return i18n.t("chat.allergenLabels.phenylalanine"); } },
  { key: "laxative", get label() { return i18n.t("chat.allergenLabels.laxative"); } },
];

const ALLERGEN_KEYS_SET = new Set(ALLERGENS.map((a) => a.key));

/**
 * Normalize a raw allergen value to its canonical key.
 * Accepts either the key itself (e.g. "gluten") or a translated label (e.g. "Gluten" / "Wheat").
 */
export const normalizeAllergenKey = (value: string) => {
  const trimmed = value.trim();
  if (ALLERGEN_KEYS_SET.has(trimmed)) return trimmed;
  // Fallback: match by current translated label
  const lower = trimmed.toLowerCase();
  for (const allergen of ALLERGENS) {
    if (allergen.label.toLowerCase() === lower) return allergen.key;
  }
  return trimmed;
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

/** Returns the translated display label for an allergen key. Falls back to the key itself. */
export const getAllergenLabel = (key: string): string => {
  const translationKey = `chat.allergenLabels.${key}`;
  const translated = i18n.t(translationKey);
  // i18next returns the key path if no translation is found
  return translated === translationKey ? key : translated;
};
