import type { LifeOS, DayLog, WeekLog, WeightEntry, WorkoutSession } from "./types";

// Client fields stored whole as JSON in the user_state table
export const USER_STATE_KEYS = ["settings", "shoppingList", "archivedWeeks", "activeWeekKey"] as const;
export type UserStateKey = (typeof USER_STATE_KEYS)[number];

// DB row types (matching Drizzle select results)
interface DayLogRow {
  dateKey: string;
  moodScore: number | null;
  energyScore: number | null;
  stressScore: number | null;
  libidoScore: number | null;
  checkInNote: string | null;
  calories: number | null;
  protein: number | null;
  spendAmount: number | null;
  todos: string | null; // JSON array of strings
  updatedAt: string;
}

interface WeekLogRow {
  weekKey: string;
  zone2Target: number | null;
  zone2Done: number | null;
  zone2MinutesEach: number | null;
  zone2Days: string | null; // JSON array of day numbers
  completions: string | null; // JSON array of {slotId, completedAt}
  workoutSessions: string | null; // JSON array of WorkoutSession
  strengthTarget: number | null;
  strengthDay1: number | null; // Day of week (1-7) or null
  strengthDay2: number | null;
  strengthDay3: number | null;
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

interface UserStateRow {
  key: string;
  value: string; // JSON
}

// ── DB → Client ────────────────────────────────────────────────

function parseTodos(json: string | null): string[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function dbToLifeOS(
  dayLogRows: DayLogRow[],
  weekLogRows: WeekLogRow[],
  weightEntryRows: WeightEntryRow[],
  dailySelectionRows: DailySelectionRow[],
  userStateRows: UserStateRow[] = [],
  meta?: { createdAt: string }
): Omit<LifeOS, "pools"> {
  const dayLogs: Record<string, DayLog> = {};
  for (const row of dayLogRows) {
    dayLogs[row.dateKey] = {
      checkIn: {
        mood: row.moodScore,
        energy: row.energyScore,
        stress: row.stressScore,
        libido: row.libidoScore,
        note: row.checkInNote ?? "",
      },
      nutrition: {
        calories: row.calories,
        protein: row.protein,
      },
      finance: {
        amount: row.spendAmount,
      },
      todos: parseTodos(row.todos),
    };
  }

  const weekLogs: Record<string, WeekLog> = {};
  for (const row of weekLogRows) {
    // Convert DB day numbers to strengthDone array
    const strengthDone: (number | null)[] = [
      row.strengthDay1,
      row.strengthDay2,
      row.strengthDay3,
    ];

    // Parse zone2Days from JSON
    let zone2Days: (number | null)[] | undefined;
    if (row.zone2Days) {
      try {
        zone2Days = JSON.parse(row.zone2Days);
      } catch {
        zone2Days = undefined;
      }
    }

    // Parse completions from JSON
    let completions: Array<{slotId: string; completedAt: number}> | undefined;
    if (row.completions) {
      try {
        completions = JSON.parse(row.completions);
      } catch {
        completions = undefined;
      }
    }

    // Parse workout sessions from JSON
    let workoutSessions: WorkoutSession[] | undefined;
    if (row.workoutSessions) {
      try {
        workoutSessions = JSON.parse(row.workoutSessions);
      } catch {
        workoutSessions = undefined;
      }
    }

    weekLogs[row.weekKey] = {
      weighIn: {
        weightLb: row.weighInLb,
        timestamp: row.weighInTimestamp,
      },
      workoutSessions: workoutSessions || [],
      exerciseContract: {
        completions: completions || [],
        zone2Target: row.zone2Target ?? 4,
        zone2Done: row.zone2Done ?? 0,
        zone2MinutesEach: row.zone2MinutesEach ?? 40,
        strengthTarget: row.strengthTarget ?? 3,
        strength: {
          // Legacy format - derive from day numbers for backwards compat
          armsChest: row.strengthDay1 !== null && row.strengthDay1 > 0,
          legs: row.strengthDay2 !== null && row.strengthDay2 > 0,
          coreBack: row.strengthDay3 !== null && row.strengthDay3 > 0,
        },
        strengthDone,
        zone2Days,
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

  const state: Partial<Pick<LifeOS, UserStateKey>> = {};
  for (const row of userStateRows) {
    if (!(USER_STATE_KEYS as readonly string[]).includes(row.key)) continue;
    try {
      state[row.key as UserStateKey] = JSON.parse(row.value);
    } catch {
      // Skip a corrupt row rather than failing the whole pull
    }
  }

  return {
    ...state,
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
    libidoScore: dayLog.checkIn.libido ?? null,
    checkInNote: dayLog.checkIn.note,
    calories: dayLog.nutrition.calories,
    protein: dayLog.nutrition.protein,
    spendAmount: dayLog.finance?.amount ?? null,
    todos: dayLog.todos?.length ? JSON.stringify(dayLog.todos) : null,
    updatedAt: new Date().toISOString(),
  };
}

export function weekLogToRow(weekKey: string, weekLog: WeekLog) {
  const ec = weekLog.exerciseContract;

  // Use strengthDone array if available, otherwise fall back to legacy format
  let day1: number | null = null;
  let day2: number | null = null;
  let day3: number | null = null;

  if (ec.strengthDone && ec.strengthDone.length > 0) {
    day1 = ec.strengthDone[0] ?? null;
    day2 = ec.strengthDone[1] ?? null;
    day3 = ec.strengthDone[2] ?? null;
  } else if (ec.strength) {
    // Convert legacy booleans to day numbers (use 1 as placeholder for "done")
    day1 = ec.strength.armsChest ? 1 : null;
    day2 = ec.strength.legs ? 1 : null;
    day3 = ec.strength.coreBack ? 1 : null;
  }

  return {
    weekKey,
    zone2Target: ec.zone2Target,
    zone2Done: ec.zone2Done,
    zone2MinutesEach: ec.zone2MinutesEach,
    zone2Days: ec.zone2Days ? JSON.stringify(ec.zone2Days) : null,
    completions: ec.completions && ec.completions.length > 0 ? JSON.stringify(ec.completions) : null,
    workoutSessions: weekLog.workoutSessions && weekLog.workoutSessions.length > 0 ? JSON.stringify(weekLog.workoutSessions) : null,
    strengthTarget: ec.strengthTarget,
    strengthDay1: day1,
    strengthDay2: day2,
    strengthDay3: day3,
    weighInLb: weekLog.weighIn.weightLb,
    weighInTimestamp: weekLog.weighIn.timestamp,
    updatedAt: new Date().toISOString(),
  };
}
