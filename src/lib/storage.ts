import type { LifeOS, DayLog, WeekLog, WeekNutritionDay, WeekFinanceDay, UserSettings } from "./types";
import { getTodayKey, getISOWeekKey, getMondayOfWeek, formatDateKey, hashString } from "./dates";

const STORAGE_KEY = "fitness_terminal_mobile_v1";

// Default target date is 12 weeks from now
const defaultTargetDate = new Date();
defaultTargetDate.setDate(defaultTargetDate.getDate() + 84);

export const DEFAULT_SETTINGS: UserSettings = {
  calorieTarget: 2000,
  proteinTarget: 180,
  weekdaySpendTarget: 50,
  weekendSpendTarget: 75,
  zone2Sessions: 4,
  zone2Minutes: 40,
  strengthSessions: 3,
  strengthLabels: ["Arms", "Legs", "Core / Back / Chest"],
  targetWeight: 180,
  targetWeightDate: defaultTargetDate.toISOString().split("T")[0],
};

const DEFAULT_PHILOSOPHY_LINES = [
  "The only way to do great work is to love what you do.",
  "Begin again. Every moment is a fresh start.",
  "Progress, not perfection.",
  "Small steps lead to great journeys.",
  "Your body is your instrument. Tune it daily.",
  "Discipline is choosing what you want most over what you want now.",
  "The obstacle is the way.",
  "What you do today matters more than what you plan tomorrow.",
  "Consistency beats intensity.",
  "Rest is part of the work.",
  "You are what you repeatedly do.",
  "Energy flows where attention goes.",
  "Show up. That's most of the battle.",
  "Movement is medicine.",
  "Your future self will thank you.",
  "One day or day one. You decide.",
  "The body achieves what the mind believes.",
  "Start where you are. Use what you have.",
  "Growth happens outside comfort zones.",
  "Today's effort is tomorrow's strength.",
  "Be patient with yourself. Nothing blooms year-round.",
  "Action cures fear.",
  "You don't have to be extreme, just consistent.",
  "The best project you'll ever work on is you.",
];

function createDefaultLifeOS(): LifeOS {
  return {
    meta: {
      version: 1,
      createdAt: new Date().toISOString(),
      lastOpenedAt: new Date().toISOString(),
    },
    dayLogs: {},
    weekLogs: {},
    weightEntries: [],
    pools: {
      philosophyLines: [...DEFAULT_PHILOSOPHY_LINES],
    },
    dailySelections: {},
    settings: { ...DEFAULT_SETTINGS },
  };
}

/** Ensure settings exist with all required fields */
export function ensureSettings(lifeOS: LifeOS): LifeOS {
  if (!lifeOS.settings) {
    lifeOS.settings = { ...DEFAULT_SETTINGS };
  } else {
    // Ensure all fields exist (for existing users upgrading)
    lifeOS.settings = { ...DEFAULT_SETTINGS, ...lifeOS.settings };
  }
  return lifeOS;
}

/** Get current settings with defaults as fallback */
export function getSettings(lifeOS: LifeOS): UserSettings {
  return lifeOS.settings ? { ...DEFAULT_SETTINGS, ...lifeOS.settings } : { ...DEFAULT_SETTINGS };
}

/** Load LifeOS data from localStorage, or create defaults */
export function loadLifeOS(): LifeOS {
  if (typeof window === "undefined") return createDefaultLifeOS();
  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (e) {
    console.error("Error loading data:", e);
  }
  return createDefaultLifeOS();
}

/** Save LifeOS data to localStorage */
export function saveLifeOS(lifeOS: LifeOS): boolean {
  if (typeof window === "undefined") return false;
  try {
    lifeOS.meta.lastOpenedAt = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lifeOS));
    return true;
  } catch (e) {
    console.error("Error saving data:", e);
    return false;
  }
}

function createDefaultDayLog(): DayLog {
  return {
    checkIn: { mood: null, energy: null, stress: null, note: "" },
    nutrition: { calories: null, protein: null },
    finance: { amount: null },
    todos: [],
  };
}

function createDefaultWeekLog(): WeekLog {
  return {
    weighIn: { weightLb: null, timestamp: null },
    exerciseContract: {
      zone2Target: 4,
      zone2Done: 0,
      zone2MinutesEach: 40,
      strengthTarget: 3,
      strength: { armsChest: false, legs: false, coreBack: false },
    },
  };
}

/** Ensure today's day log exists with all required fields */
export function ensureDayLog(lifeOS: LifeOS, dateKey?: string): LifeOS {
  const key = dateKey || getTodayKey();
  if (!lifeOS.dayLogs[key]) {
    lifeOS.dayLogs[key] = createDefaultDayLog();
  }
  // Ensure sub-objects exist
  if (!lifeOS.dayLogs[key].checkIn) {
    lifeOS.dayLogs[key].checkIn = { mood: null, energy: null, stress: null, note: "" };
  }
  if (!lifeOS.dayLogs[key].nutrition) {
    lifeOS.dayLogs[key].nutrition = { calories: null, protein: null };
  }
  if (!lifeOS.dayLogs[key].finance) {
    lifeOS.dayLogs[key].finance = { amount: null };
  }
  return lifeOS;
}

/** Ensure this week's log exists with all required fields */
export function ensureWeekLog(lifeOS: LifeOS): LifeOS {
  const weekKey = getISOWeekKey();
  if (!lifeOS.weekLogs[weekKey]) {
    lifeOS.weekLogs[weekKey] = createDefaultWeekLog();
  }
  const wl = lifeOS.weekLogs[weekKey];
  if (!wl.exerciseContract) {
    wl.exerciseContract = createDefaultWeekLog().exerciseContract;
  }
  if (!wl.exerciseContract.strength) {
    wl.exerciseContract.strength = { armsChest: false, legs: false, coreBack: false };
  }
  return lifeOS;
}

/** Pick a deterministic philosophy line for a given day */
export function pickDailyPhilosophyLine(lifeOS: LifeOS, todayKey: string): string {
  if (!lifeOS.pools?.philosophyLines?.length) {
    lifeOS.pools = { philosophyLines: [...DEFAULT_PHILOSOPHY_LINES] };
  }

  if (lifeOS.dailySelections[todayKey]?.philosophyLine !== undefined) {
    const idx = lifeOS.dailySelections[todayKey].philosophyLine!;
    return lifeOS.pools.philosophyLines[idx] || lifeOS.pools.philosophyLines[0];
  }

  const hash = hashString(todayKey + "_philosophy");
  const idx = hash % lifeOS.pools.philosophyLines.length;
  if (!lifeOS.dailySelections[todayKey]) {
    lifeOS.dailySelections[todayKey] = {};
  }
  lifeOS.dailySelections[todayKey].philosophyLine = idx;
  return lifeOS.pools.philosophyLines[idx];
}

/** Get nutrition data for each day of the current week */
export function getThisWeekNutrition(lifeOS: LifeOS): WeekNutritionDay[] {
  const monday = getMondayOfWeek();
  const todayKey = getTodayKey();
  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const weekNutrition: WeekNutritionDay[] = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dateKey = formatDateKey(d);
    weekNutrition.push({
      date: dateKey,
      dayName: dayNames[i],
      calories: lifeOS.dayLogs[dateKey]?.nutrition?.calories ?? null,
      protein: lifeOS.dayLogs[dateKey]?.nutrition?.protein ?? null,
      isToday: dateKey === todayKey,
    });
  }

  return weekNutrition;
}

/** Get finance data for each day of the current week */
export function getThisWeekFinance(lifeOS: LifeOS): WeekFinanceDay[] {
  const monday = getMondayOfWeek();
  const todayKey = getTodayKey();
  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const weekFinance: WeekFinanceDay[] = [];
  const settings = getSettings(lifeOS);

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dateKey = formatDateKey(d);
    // Use settings for weekday/weekend targets
    const target = i < 5 ? settings.weekdaySpendTarget : settings.weekendSpendTarget;
    weekFinance.push({
      date: dateKey,
      dayName: dayNames[i],
      dayOfWeek: i,
      amount: lifeOS.dayLogs[dateKey]?.finance?.amount ?? null,
      target,
      isToday: dateKey === todayKey,
    });
  }

  return weekFinance;
}

/** Export all data as a JSON string for download */
export function exportDataToJSON(lifeOS: LifeOS): string {
  const data = {
    ...lifeOS,
    exportDate: new Date().toISOString(),
    exportVersion: "fitness_terminal_mobile_v1",
  };
  return JSON.stringify(data, null, 2);
}

/** Import data from a JSON string. Returns the parsed LifeOS or throws. */
export function importDataFromJSON(jsonString: string, currentLifeOS: LifeOS): LifeOS {
  const data = JSON.parse(jsonString);
  if (!data.meta || !data.dayLogs) {
    throw new Error("Invalid data format: missing meta or dayLogs");
  }
  return {
    ...currentLifeOS,
    ...data,
    meta: {
      ...currentLifeOS.meta,
      ...data.meta,
      lastOpenedAt: new Date().toISOString(),
    },
  };
}

/** Merge server data into local data. Server wins for existing records. */
export function mergeData(
  local: LifeOS,
  server: Omit<LifeOS, "pools">
): LifeOS {
  const merged = { ...local };

  // Merge day logs — server wins for matching keys
  if (server.dayLogs) {
    merged.dayLogs = { ...local.dayLogs };
    for (const [key, serverDay] of Object.entries(server.dayLogs)) {
      const localDay = local.dayLogs[key];
      if (!localDay) {
        merged.dayLogs[key] = serverDay;
      } else {
        // Server wins: overwrite with server data, keep local fields server doesn't have
        merged.dayLogs[key] = {
          ...localDay,
          checkIn: {
            mood: serverDay.checkIn.mood ?? localDay.checkIn.mood,
            energy: serverDay.checkIn.energy ?? localDay.checkIn.energy,
            stress: serverDay.checkIn.stress ?? localDay.checkIn.stress,
            note: serverDay.checkIn.note || localDay.checkIn.note,
          },
          nutrition: {
            calories: serverDay.nutrition.calories ?? localDay.nutrition.calories,
            protein: serverDay.nutrition.protein ?? localDay.nutrition.protein,
          },
          finance: {
            amount: serverDay.finance?.amount ?? localDay.finance?.amount ?? null,
          },
          todos: localDay.todos,
        };
      }
    }
  }

  // Merge week logs — server wins
  if (server.weekLogs) {
    merged.weekLogs = { ...local.weekLogs, ...server.weekLogs };
  }

  // Merge weight entries — deduplicate by date+weight
  if (server.weightEntries) {
    const seen = new Set<string>();
    const allEntries = [...server.weightEntries, ...local.weightEntries];
    merged.weightEntries = [];
    for (const entry of allEntries) {
      const key = `${entry.date}_${entry.weightLb}`;
      if (!seen.has(key)) {
        seen.add(key);
        merged.weightEntries.push(entry);
      }
    }
    merged.weightEntries.sort((a, b) => b.date.localeCompare(a.date));
  }

  // Merge daily selections — server wins
  if (server.dailySelections) {
    merged.dailySelections = { ...local.dailySelections, ...server.dailySelections };
  }

  merged.meta.lastOpenedAt = new Date().toISOString();
  return merged;
}
