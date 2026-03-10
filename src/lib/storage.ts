import type { LifeOS, DayLog, WeekLog, WeekNutritionDay, WeekFinanceDay, UserSettings, WeeklySummary, ExerciseSlot } from "./types";
import { getTodayKey, getISOWeekKey, getMondayOfWeek, formatDateKey, hashString } from "./dates";

const STORAGE_KEY = "fitness_terminal_mobile_v1";

// Default target date is 12 weeks from now
const defaultTargetDate = new Date();
defaultTargetDate.setDate(defaultTargetDate.getDate() + 84);

// Default exercise slots: Cardio, Legs, Push, Pull
const DEFAULT_EXERCISE_SLOTS: ExerciseSlot[] = [
  { id: "cardio-0", label: "Cardio", type: "cardio" },
  { id: "cardio-1", label: "Cardio", type: "cardio" },
  { id: "cardio-2", label: "Cardio", type: "cardio" },
  { id: "cardio-3", label: "Cardio", type: "cardio" },
  { id: "legs-0", label: "Legs", type: "legs" },
  { id: "push-0", label: "Push", type: "push" },
  { id: "pull-0", label: "Pull", type: "pull" },
];

export const DEFAULT_SETTINGS: UserSettings = {
  calorieTarget: 2000,
  proteinTarget: 180,
  weekdaySpendTarget: 50,
  weekendSpendTarget: 75,
  // New exercise model
  exerciseTarget: 7,
  exerciseSlots: DEFAULT_EXERCISE_SLOTS,
  // Legacy exercise settings (kept for migration)
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
  "Show up. That is most of the battle.",
  "Movement is medicine.",
  "Your future self will thank you.",
  "One day or day one. You decide.",
  "The body achieves what the mind believes.",
  "Start where you are. Use what you have.",
  "Growth happens outside comfort zones.",
  "Today effort is tomorrow strength.",
  "Be patient with yourself. Nothing blooms year-round.",
  "Action cures fear.",
  "You do not have to be extreme, just consistent.",
  "The best project you will ever work on is you.",
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
    archivedWeeks: [],
    activeWeekKey: getISOWeekKey(),
  };
}

/** Ensure settings exist with all required fields */
export function ensureSettings(lifeOS: LifeOS): LifeOS {
  if (!lifeOS.settings) {
    lifeOS.settings = { ...DEFAULT_SETTINGS };
  } else {
    lifeOS.settings = { ...DEFAULT_SETTINGS, ...lifeOS.settings };
    if (!lifeOS.settings.exerciseSlots || lifeOS.settings.exerciseSlots.length === 0) {
      lifeOS.settings.exerciseSlots = DEFAULT_EXERCISE_SLOTS;
    }
    if (!lifeOS.settings.exerciseTarget) {
      lifeOS.settings.exerciseTarget = 7;
    }
  }
  return lifeOS;
}

/** Get current settings with defaults as fallback */
export function getSettings(lifeOS: LifeOS): UserSettings {
  const settings = lifeOS.settings ? { ...DEFAULT_SETTINGS, ...lifeOS.settings } : { ...DEFAULT_SETTINGS };
  if (!settings.exerciseSlots || settings.exerciseSlots.length === 0) {
    settings.exerciseSlots = DEFAULT_EXERCISE_SLOTS;
  }
  if (!settings.exerciseTarget) {
    settings.exerciseTarget = 7;
  }
  return settings;
}

/** Load LifeOS data from localStorage, or create defaults */
export function loadLifeOS(): LifeOS {
  if (typeof window === "undefined") return createDefaultLifeOS();
  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      const data = JSON.parse(cached) as LifeOS;
      if (!data.archivedWeeks) data.archivedWeeks = [];
      if (!data.activeWeekKey) data.activeWeekKey = getISOWeekKey();
      return data;
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
      completions: [],
      zone2Target: 4,
      zone2Done: 0,
      zone2MinutesEach: 40,
      strengthTarget: 3,
      strength: { armsChest: false, legs: false, coreBack: false },
    },
  };
}

/** Ensure today day log exists with all required fields */
export function ensureDayLog(lifeOS: LifeOS, dateKey?: string): LifeOS {
  const key = dateKey || getTodayKey();
  if (!lifeOS.dayLogs[key]) {
    lifeOS.dayLogs[key] = createDefaultDayLog();
  }
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

/** Ensure the specified week log exists with all required fields */
export function ensureWeekLog(lifeOS: LifeOS, weekKey?: string): LifeOS {
  const key = weekKey || getISOWeekKey();
  if (!lifeOS.weekLogs[key]) {
    lifeOS.weekLogs[key] = createDefaultWeekLog();
  }
  const wl = lifeOS.weekLogs[key];
  if (!wl.exerciseContract) {
    wl.exerciseContract = createDefaultWeekLog().exerciseContract;
  }
  if (!wl.exerciseContract.strength) {
    wl.exerciseContract.strength = { armsChest: false, legs: false, coreBack: false };
  }
  if (!wl.exerciseContract.completions) {
    wl.exerciseContract.completions = [];
  }
  return lifeOS;
}

/** Check if there is a week pending close-out */
export function hasPendingWeekCloseout(lifeOS: LifeOS): boolean {
  const currentWeekKey = getISOWeekKey();
  const activeWeekKey = lifeOS.activeWeekKey;
  if (!activeWeekKey) return false;
  return activeWeekKey !== currentWeekKey;
}

/** Get the week key that needs close-out (if any) */
export function getPendingCloseoutWeekKey(lifeOS: LifeOS): string | null {
  if (!hasPendingWeekCloseout(lifeOS)) return null;
  return lifeOS.activeWeekKey || null;
}

/** Get Monday and Sunday dates for a given week key */
export function getWeekDateRange(weekKey: string): { startDate: string; endDate: string } {
  const match = weekKey.match(/^(\d{4})-W(\d{2})$/);
  if (!match) {
    const monday = getMondayOfWeek();
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    return { startDate: formatDateKey(monday), endDate: formatDateKey(sunday) };
  }
  const year = parseInt(match[1]);
  const week = parseInt(match[2]);
  const jan4 = new Date(year, 0, 4);
  const dayOfWeek = jan4.getDay() || 7;
  const monday = new Date(jan4);
  monday.setDate(jan4.getDate() - dayOfWeek + 1 + (week - 1) * 7);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { startDate: formatDateKey(monday), endDate: formatDateKey(sunday) };
}

/** Calculate weekly summary for a given week */
export function calculateWeeklySummary(lifeOS: LifeOS, weekKey: string): WeeklySummary {
  const settings = getSettings(lifeOS);
  const { startDate, endDate } = getWeekDateRange(weekKey);
  const weekLog = lifeOS.weekLogs[weekKey];

  const monday = new Date(startDate + "T00:00:00");
  const days: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push(formatDateKey(d));
  }

  let calSum = 0, proteinSum = 0, nutritionDays = 0;
  for (const dateKey of days) {
    const dayLog = lifeOS.dayLogs[dateKey];
    if (dayLog?.nutrition?.calories !== null && dayLog?.nutrition?.calories !== undefined) {
      calSum += dayLog.nutrition.calories;
      proteinSum += dayLog.nutrition.protein || 0;
      nutritionDays++;
    }
  }

  let moodSum = 0, energySum = 0, stressSum = 0, checkInDays = 0;
  for (const dateKey of days) {
    const dayLog = lifeOS.dayLogs[dateKey];
    if (dayLog?.checkIn?.mood !== null && dayLog?.checkIn?.mood !== undefined) {
      moodSum += dayLog.checkIn.mood;
      energySum += dayLog.checkIn.energy || 0;
      stressSum += dayLog.checkIn.stress || 0;
      checkInDays++;
    }
  }

  let exerciseSessions = 0;
  if (weekLog?.exerciseContract?.completions) {
    exerciseSessions = weekLog.exerciseContract.completions.length;
  } else if (weekLog?.exerciseContract) {
    const ec = weekLog.exerciseContract;
    exerciseSessions = (ec.zone2Done || 0);
    if (ec.strengthDone) {
      exerciseSessions += ec.strengthDone.filter(Boolean).length;
    } else if (ec.strength) {
      exerciseSessions += (ec.strength.armsChest ? 1 : 0) + (ec.strength.legs ? 1 : 0) + (ec.strength.coreBack ? 1 : 0);
    }
  }

  let totalSpent = 0;
  for (const dateKey of days) {
    const dayLog = lifeOS.dayLogs[dateKey];
    if (dayLog?.finance?.amount !== null && dayLog?.finance?.amount !== undefined) {
      totalSpent += dayLog.finance.amount;
    }
  }
  const weeklyBudget = settings.weekdaySpendTarget * 5 + settings.weekendSpendTarget * 2;

  const weekWeights = lifeOS.weightEntries
    .filter(e => e.date >= startDate && e.date <= endDate)
    .sort((a, b) => a.date.localeCompare(b.date));
  const startWeight = weekWeights.length > 0 ? weekWeights[0].weightLb : null;
  const endWeight = weekWeights.length > 0 ? weekWeights[weekWeights.length - 1].weightLb : null;
  const weightChange = (startWeight !== null && endWeight !== null) ? endWeight - startWeight : null;

  return {
    weekKey,
    startDate,
    endDate,
    closedAt: new Date().toISOString(),
    avgCalories: nutritionDays > 0 ? Math.round(calSum / nutritionDays) : null,
    avgProtein: nutritionDays > 0 ? Math.round(proteinSum / nutritionDays) : null,
    daysWithNutrition: nutritionDays,
    avgMood: checkInDays > 0 ? Math.round((moodSum / checkInDays) * 10) / 10 : null,
    avgEnergy: checkInDays > 0 ? Math.round((energySum / checkInDays) * 10) / 10 : null,
    avgStress: checkInDays > 0 ? Math.round((stressSum / checkInDays) * 10) / 10 : null,
    daysWithCheckIn: checkInDays,
    exerciseSessionsCompleted: exerciseSessions,
    exerciseTarget: settings.exerciseTarget,
    totalSpent: Math.round(totalSpent * 100) / 100,
    weeklyBudget,
    startWeight,
    endWeight,
    weightChange: weightChange !== null ? Math.round(weightChange * 10) / 10 : null,
  };
}

/** Close out a week - calculates summary, archives it, and starts fresh week */
export function closeOutWeek(lifeOS: LifeOS, weekKey: string): LifeOS {
  const summary = calculateWeeklySummary(lifeOS, weekKey);
  if (!lifeOS.archivedWeeks) lifeOS.archivedWeeks = [];
  const existingIndex = lifeOS.archivedWeeks.findIndex(w => w.weekKey === weekKey);
  if (existingIndex >= 0) {
    lifeOS.archivedWeeks[existingIndex] = summary;
  } else {
    lifeOS.archivedWeeks.push(summary);
  }
  lifeOS.archivedWeeks.sort((a, b) => b.weekKey.localeCompare(a.weekKey));
  const currentWeekKey = getISOWeekKey();
  lifeOS.activeWeekKey = currentWeekKey;
  lifeOS = ensureWeekLog(lifeOS, currentWeekKey);
  return lifeOS;
}

/** Get data for a specific week (whether active or from archive) */
export function getWeekData(lifeOS: LifeOS, weekKey: string): {
  weekLog: WeekLog | null;
  summary: WeeklySummary | null;
  isArchived: boolean;
} {
  const archived = lifeOS.archivedWeeks?.find(w => w.weekKey === weekKey);
  if (archived) {
    return { weekLog: lifeOS.weekLogs[weekKey] || null, summary: archived, isArchived: true };
  }
  return { weekLog: lifeOS.weekLogs[weekKey] || null, summary: null, isArchived: false };
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
  if (!lifeOS.dailySelections[todayKey]) lifeOS.dailySelections[todayKey] = {};
  lifeOS.dailySelections[todayKey].philosophyLine = idx;
  return lifeOS.pools.philosophyLines[idx];
}

/** Get nutrition data for each day of a specific week */
export function getWeekNutrition(lifeOS: LifeOS, weekKey: string): WeekNutritionDay[] {
  const { startDate } = getWeekDateRange(weekKey);
  const monday = new Date(startDate + "T00:00:00");
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

/** Get nutrition data for each day of the current week */
export function getThisWeekNutrition(lifeOS: LifeOS): WeekNutritionDay[] {
  return getWeekNutrition(lifeOS, getISOWeekKey());
}

/** Get finance data for each day of a specific week */
export function getWeekFinance(lifeOS: LifeOS, weekKey: string): WeekFinanceDay[] {
  const { startDate } = getWeekDateRange(weekKey);
  const monday = new Date(startDate + "T00:00:00");
  const todayKey = getTodayKey();
  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const weekFinance: WeekFinanceDay[] = [];
  const settings = getSettings(lifeOS);
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dateKey = formatDateKey(d);
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

/** Get finance data for each day of the current week */
export function getThisWeekFinance(lifeOS: LifeOS): WeekFinanceDay[] {
  return getWeekFinance(lifeOS, getISOWeekKey());
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
export function mergeData(local: LifeOS, server: Omit<LifeOS, "pools">): LifeOS {
  const merged = { ...local };

  if (server.dayLogs) {
    merged.dayLogs = { ...local.dayLogs };
    for (const [key, serverDay] of Object.entries(server.dayLogs)) {
      const localDay = local.dayLogs[key];
      if (!localDay) {
        merged.dayLogs[key] = serverDay;
      } else {
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

  if (server.weekLogs) {
    merged.weekLogs = { ...local.weekLogs };
    for (const [key, serverWeek] of Object.entries(server.weekLogs)) {
      const localWeek = local.weekLogs[key];
      if (!localWeek) {
        merged.weekLogs[key] = serverWeek;
      } else {
        // Merge weekLogs - prefer local completions if they exist, otherwise use server
        const localCompletions = localWeek.exerciseContract?.completions || [];
        const serverCompletions = serverWeek.exerciseContract?.completions || [];
        // Use whichever has more completions (most recent data)
        const mergedCompletions = localCompletions.length >= serverCompletions.length 
          ? localCompletions 
          : serverCompletions;
        
        merged.weekLogs[key] = {
          ...serverWeek,
          exerciseContract: {
            ...serverWeek.exerciseContract,
            completions: mergedCompletions,
          },
        };
      }
    }
  }

  if (server.weightEntries) {
    const seen = new Set<string>();
    const allEntries = [...server.weightEntries, ...local.weightEntries];
    merged.weightEntries = [];
    for (const entry of allEntries) {
      const key = entry.date + "_" + entry.weightLb;
      if (!seen.has(key)) {
        seen.add(key);
        merged.weightEntries.push(entry);
      }
    }
    merged.weightEntries.sort((a, b) => b.date.localeCompare(a.date));
  }

  if (server.dailySelections) {
    merged.dailySelections = { ...local.dailySelections, ...server.dailySelections };
  }

  if (server.archivedWeeks) {
    const archivedMap = new Map<string, WeeklySummary>();
    for (const w of (local.archivedWeeks || [])) archivedMap.set(w.weekKey, w);
    for (const w of server.archivedWeeks) archivedMap.set(w.weekKey, w);
    merged.archivedWeeks = Array.from(archivedMap.values()).sort((a, b) => b.weekKey.localeCompare(a.weekKey));
  }

  merged.meta.lastOpenedAt = new Date().toISOString();
  return merged;
}
