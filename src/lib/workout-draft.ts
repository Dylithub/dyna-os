import type { WorkoutType } from "./types";

// An in-progress workout, kept in localStorage until FINISH or CANCEL.
// Device-local on purpose: it's only needed to resume on the same phone.
const DRAFT_KEY = "dyna_os_workout_draft";

// Draft rows keep raw strings so inputs can be empty while editing
export interface DraftRow {
  name: string;
  kg: string;
  reps: string;
  sets: string;
}

export interface WorkoutDraft {
  slotId: string;
  weekKey: string;
  type: WorkoutType;
  rows: DraftRow[];
}

export function loadWorkoutDraft(): WorkoutDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as WorkoutDraft) : null;
  } catch {
    return null;
  }
}

export function saveWorkoutDraft(draft: WorkoutDraft) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // Storage full or blocked — the workout still saves on FINISH
  }
}

export function clearWorkoutDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // ignore
  }
}
