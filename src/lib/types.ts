// These types define the exact shape of your data.
// Refactored to support:
// - Weekly close-out workflow
// - Clean exercise tracking with ordered completions
// - Archived weekly summaries

export interface CheckIn {
  mood: number | null;
  energy: number | null;
  stress: number | null; // "calm" in the UI, stored as "stress" for backwards compat
  note: string;
}

export interface Nutrition {
  calories: number | null;
  protein: number | null;
}

export interface DailySpend {
  amount: number | null;
}

export interface DayLog {
  checkIn: CheckIn;
  nutrition: Nutrition;
  finance: DailySpend;
  todos: string[];
}

// Exercise completion stored as ordered array
// Each item has the slot ID and when it was completed (for ordering)
export interface ExerciseCompletion {
  slotId: string; // e.g., "cardio-0", "legs-0", "push-0", "pull-0"
  completedAt: number; // timestamp for ordering
}

// Legacy format - kept for backwards compatibility
export interface StrengthSessions {
  armsChest: boolean;
  legs: boolean;
  coreBack: boolean;
}

// Exercise contract for a week - uses ordered completion model
export interface ExerciseContract {
  // New ordered completion model
  completions?: ExerciseCompletion[];

  // Legacy fields for backwards compatibility
  zone2Target: number;
  zone2Done: number;
  zone2MinutesEach: number;
  strengthTarget: number;
  strength: StrengthSessions;
  strengthDone?: (number | null)[];
  zone2Days?: (number | null)[];
}

export interface WeekLog {
  weighIn: {
    weightLb: number | null;
    timestamp: string | null;
  };
  exerciseContract: ExerciseContract;
}

// Weekly summary created when a week is closed out
export interface WeeklySummary {
  weekKey: string; // e.g., "2025-W09"
  startDate: string; // Monday YYYY-MM-DD
  endDate: string; // Sunday YYYY-MM-DD
  closedAt: string; // ISO timestamp when closed

  // Nutrition averages
  avgCalories: number | null;
  avgProtein: number | null;
  daysWithNutrition: number;

  // Check-in averages
  avgMood: number | null;
  avgEnergy: number | null;
  avgStress: number | null;
  daysWithCheckIn: number;

  // Exercise
  exerciseSessionsCompleted: number;
  exerciseTarget: number;

  // Finances
  totalSpent: number;
  weeklyBudget: number;

  // Weight
  startWeight: number | null;
  endWeight: number | null;
  weightChange: number | null;
}

export interface WeightEntry {
  weightLb: number;
  date: string; // YYYY-MM-DD
}

export interface LifeOSMeta {
  version: number;
  createdAt: string;
  lastOpenedAt: string;
}

// Exercise slot configuration
export interface ExerciseSlot {
  id: string;
  label: string;
  type: "cardio" | "legs" | "push" | "pull" | "custom";
}

export interface UserSettings {
  // Nutrition targets
  calorieTarget: number;
  proteinTarget: number;
  // Finance targets
  weekdaySpendTarget: number;
  weekendSpendTarget: number;
  // Exercise targets - new unified model
  exerciseTarget: number; // total sessions per week (default 7)
  exerciseSlots: ExerciseSlot[]; // configurable exercise types
  // Legacy exercise settings (preserved for migration)
  zone2Sessions: number;
  zone2Minutes: number;
  strengthSessions: number;
  strengthLabels: string[];
  // Weight target
  targetWeight: number;
  targetWeightDate: string; // ISO date string (YYYY-MM-DD)
}

// Week status for tracking lifecycle
export type WeekStatus = "active" | "pending_closeout" | "archived";

export interface LifeOS {
  meta: LifeOSMeta;
  dayLogs: Record<string, DayLog>;
  weekLogs: Record<string, WeekLog>;
  weightEntries: WeightEntry[];
  pools: {
    philosophyLines: string[];
  };
  dailySelections: Record<string, { philosophyLine?: number }>;
  settings?: UserSettings;

  // Weekly archive system
  archivedWeeks?: WeeklySummary[];

  // Track which week is active vs pending close-out
  // If activeWeekKey doesn't match calendar week, the previous week needs close-out
  activeWeekKey?: string;
}

// Used by the Calories page to show the weekly grid
export interface WeekNutritionDay {
  date: string;
  dayName: string;
  calories: number | null;
  protein: number | null;
  isToday: boolean;
}

// Used by the Finances page to show the weekly grid
export interface WeekFinanceDay {
  date: string;
  dayName: string;
  dayOfWeek: number; // 0 = Monday, 6 = Sunday
  amount: number | null;
  target: number; // $50 Mon-Fri, $75 Sat-Sun
  isToday: boolean;
}
