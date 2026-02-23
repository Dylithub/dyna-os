import type { LifeOS, DayLog, WeekLog, WeightEntry } from "./types";

// DB row types (matching Drizzle select results)
interface DayLogRow {
  dateKey: string;
  moodScore: number | null;
  energyScore: number | null;
  stressScore: number | null;
  checkInNote: string | null;
  calories: number | null;
  protein: number | null;
  updatedAt: string;
}

interface WeekLogRow {
  weekKey: string;
  zone2Target: number | null;
  zone2Done: number | null;
  zone2MinutesEach: number | null;
  strengthTarget: number | null;
  strengthArmsChest: boolean | null;
  strengthLegs: boolean | null;
  strengthCoreBack: boolean | null;
  weighInLb: number | null;
  weighInTimestamp: string | null;
  updatedAt: string;
}

interface WeightEntryRow {
  id: number;
  weightLb: number;
  date: string;
}

interface DailySelectionRow {
  dateKey: string;
  philosophyLine: number | null;
}

// ── DB → Client ────────────────────────────────────────────────

export function dbToLifeOS(
  dayLogRows: DayLogRow[],
  weekLogRows: WeekLogRow[],
  weightEntryRows: WeightEntryRow[],
  dailySelectionRows: DailySelectionRow[],
  meta?: { createdAt: string }
): Omit<LifeOS, "pools"> {
  const dayLogs: Record<string, DayLog> = {};
  for (const row of dayLogRows) {
    dayLogs[row.dateKey] = {
      checkIn: {
        mood: row.moodScore,
        energy: row.energyScore,
        stress: row.stressScore,
        note: row.checkInNote ?? "",
      },
      nutrition: {
        calories: row.calories,
        protein: row.protein,
      },
      finance: {
        amount: null,
      },
      todos: [],
    };
  }

  const weekLogs: Record<string, WeekLog> = {};
  for (const row of weekLogRows) {
    weekLogs[row.weekKey] = {
      weighIn: {
        weightLb: row.weighInLb,
        timestamp: row.weighInTimestamp,
      },
      exerciseContract: {
        zone2Target: row.zone2Target ?? 4,
        zone2Done: row.zone2Done ?? 0,
        zone2MinutesEach: row.zone2MinutesEach ?? 40,
        strengthTarget: row.strengthTarget ?? 3,
        strength: {
          armsChest: row.strengthArmsChest ?? false,
          legs: row.strengthLegs ?? false,
          coreBack: row.strengthCoreBack ?? false,
        },
      },
    };
  }

  const weightEntries: WeightEntry[] = weightEntryRows.map((row) => ({
    weightLb: row.weightLb,
    date: row.date,
  }));

  const dailySelections: Record<string, { philosophyLine?: number }> = {};
  for (const row of dailySelectionRows) {
    dailySelections[row.dateKey] = {
      philosophyLine: row.philosophyLine ?? undefined,
    };
  }

  return {
    meta: {
      version: 2,
      createdAt: meta?.createdAt ?? new Date().toISOString(),
      lastOpenedAt: new Date().toISOString(),
    },
    dayLogs,
    weekLogs,
    weightEntries,
    dailySelections,
  };
}

// ── Client → DB insert records ─────────────────────────────────

export function dayLogToRow(dateKey: string, dayLog: DayLog) {
  return {
    dateKey,
    moodScore: dayLog.checkIn.mood,
    energyScore: dayLog.checkIn.energy,
    stressScore: dayLog.checkIn.stress,
    checkInNote: dayLog.checkIn.note,
    calories: dayLog.nutrition.calories,
    protein: dayLog.nutrition.protein,
    updatedAt: new Date().toISOString(),
  };
}

export function weekLogToRow(weekKey: string, weekLog: WeekLog) {
  return {
    weekKey,
    zone2Target: weekLog.exerciseContract.zone2Target,
    zone2Done: weekLog.exerciseContract.zone2Done,
    zone2MinutesEach: weekLog.exerciseContract.zone2MinutesEach,
    strengthTarget: weekLog.exerciseContract.strengthTarget,
    strengthArmsChest: weekLog.exerciseContract.strength.armsChest,
    strengthLegs: weekLog.exerciseContract.strength.legs,
    strengthCoreBack: weekLog.exerciseContract.strength.coreBack,
    weighInLb: weekLog.weighIn.weightLb,
    weighInTimestamp: weekLog.weighIn.timestamp,
    updatedAt: new Date().toISOString(),
  };
}
