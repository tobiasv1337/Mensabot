const WEEKDAY_INDEX: Record<string, number> = {
  monday: 1,
  montag: 1,
  tuesday: 2,
  dienstag: 2,
  wednesday: 3,
  mittwoch: 3,
  thursday: 4,
  donnerstag: 4,
  friday: 5,
  freitag: 5,
  saturday: 6,
  samstag: 6,
  sunday: 0,
  sonntag: 0,
};

export const WEEKDAY_LABELS = [
  "Sonntag",
  "Montag",
  "Dienstag",
  "Mittwoch",
  "Donnerstag",
  "Freitag",
  "Samstag",
];

const normalizeDateToken = (token: string) =>
  token
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z]/g, "");

export const toLocalISODate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const toLocalDateToken = (date: Date) => {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
};

export const parseSlashCommand = (
  rawInput: string
): { query: string; rawQuery: string; dateISO?: string; dateToken?: string } => {
  let working = rawInput.trim();
  let dateISO: string | undefined;
  let dateToken: string | undefined;

  const today = new Date();
  const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const dateMatch = working.match(/(\d{1,2})\.(\d{1,2})(?:\.(\d{2,4}))?/);
  if (dateMatch) {
    const day = Number.parseInt(dateMatch[1], 10);
    const month = Number.parseInt(dateMatch[2], 10);
    let year = dateMatch[3] ? Number.parseInt(dateMatch[3], 10) : todayDate.getFullYear();
    if (dateMatch[3] && dateMatch[3].length === 2) {
      year += 2000;
    }

    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      let candidate = new Date(year, month - 1, day);
      if (!dateMatch[3] && candidate < todayDate) {
        candidate = new Date(year + 1, month - 1, day);
      }
      if (
        candidate.getFullYear() === (dateMatch[3] ? year : candidate.getFullYear()) &&
        candidate.getMonth() === month - 1 &&
        candidate.getDate() === day
      ) {
        dateISO = toLocalISODate(candidate);
        dateToken = dateMatch[0];
      }
    }

    working = working.replace(dateMatch[0], " ");
    working = working.replace(/\s+/g, " ");
  }

  const tokens = working.split(/\s+/).filter(Boolean);
  const remainingTokens: string[] = [];

  for (const token of tokens) {
    const cleaned = normalizeDateToken(token);
    if (cleaned === "today" || cleaned === "heute") {
      if (!dateISO) {
        dateISO = toLocalISODate(todayDate);
        dateToken = token;
      }
      continue;
    }
    if (cleaned === "tomorrow" || cleaned === "morgen") {
      if (!dateISO) {
        const tomorrow = new Date(todayDate);
        tomorrow.setDate(todayDate.getDate() + 1);
        dateISO = toLocalISODate(tomorrow);
        dateToken = token;
      }
      continue;
    }
    if (cleaned === "uebermorgen" || cleaned === "dayaftertomorrow") {
      if (!dateISO) {
        const dayAfterTomorrow = new Date(todayDate);
        dayAfterTomorrow.setDate(todayDate.getDate() + 2);
        dateISO = toLocalISODate(dayAfterTomorrow);
        dateToken = token;
      }
      continue;
    }
    if (WEEKDAY_INDEX[cleaned] !== undefined) {
      if (!dateISO) {
        const target = WEEKDAY_INDEX[cleaned];
        const delta = (target - todayDate.getDay() + 7) % 7;
        const targetDate = new Date(todayDate);
        targetDate.setDate(todayDate.getDate() + delta);
        dateISO = toLocalISODate(targetDate);
        dateToken = token;
      }
      continue;
    }
    remainingTokens.push(token);
  }

  const rawQuery = remainingTokens.join(" ").trim();

  return {
    query: rawQuery.replace(/[_-]+/g, " ").trim(),
    rawQuery,
    dateISO,
    dateToken,
  };
};

export const formatCanteenCommand = (canteenName: string) =>
  canteenName
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^\p{L}\p{N}_-]/gu, "");

export const buildSlashInput = (
  base: string,
  dateToken?: string,
  options?: { trailingSpace?: boolean }
) => {
  const trimmed = base.trim();
  const core = trimmed ? `/${trimmed}` : "/";
  if (dateToken) return `${core} ${dateToken}`;
  return options?.trailingSpace ? `${core} ` : core;
};
