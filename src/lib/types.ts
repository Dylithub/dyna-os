// These types define the exact shape of your data.
// They match the structure from your original HTML app,
// minus the removed features (measurements, food log, wisdom).

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

export interface StrengthSessions {
  armsChest: boolean;
  legs: boolean;
  coreBack: boolean;
}

export interface ExerciseContract {
  zone2Target: number;
  zone2Done: number;
  zone2MinutesEach: number;
  strengthTarget: number;
  strength: StrengthSessions;
}

export interface WeekLog {
  weighIn: {
    weightLb: number | null;
    timestamp: string | null;
  };
  exerciseContract: ExerciseContract;
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

export interface LifeOS {
  meta: LifeOSMeta;
  dayLogs: Record<string, DayLog>;
  weekLogs: Record<string, WeekLog>;
  weightEntries: WeightEntry[];
  pools: {
    philosophyLines: string[];
  };
  dailySelections: Record<string, { philosophyLine?: number }>;
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
