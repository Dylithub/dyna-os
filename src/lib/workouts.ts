import type {
  LifeOS,
  UserSettings,
  WorkoutSession,
  WorkoutType,
} from "./types";

export const WORKOUT_TYPES: WorkoutType[] = ["push", "pull", "legs"];

export function isWorkoutType(type: string): type is WorkoutType {
  return WORKOUT_TYPES.includes(type as WorkoutType);
}

/** Most recent logged session of a type across all weeks (progressive overload source) */
export function getLastSessionOfType(
  lifeOS: LifeOS,
  type: WorkoutType
): WorkoutSession | null {
  let last: WorkoutSession | null = null;
  for (const weekLog of Object.values(lifeOS.weekLogs)) {
    for (const session of weekLog.workoutSessions || []) {
      if (session.type === type && (!last || session.completedAt > last.completedAt)) {
        last = session;
      }
    }
  }
  return last;
}

/** Find the session logged for a specific slot in a specific week, if any */
export function getSessionForSlot(
  lifeOS: LifeOS,
  weekKey: string,
  slotId: string
): WorkoutSession | null {
  const sessions = lifeOS.weekLogs[weekKey]?.workoutSessions || [];
  return sessions.find((s) => s.slotId === slotId) ?? null;
}

// Fixed training order: the suggestion always follows on from the last P/P/L day done
export const WORKOUT_ROTATION: WorkoutType[] = ["push", "legs", "pull"];

/** Type of the most recently completed push/pull/legs slot, across all weeks */
export function getLastCompletedWorkoutType(
  lifeOS: LifeOS,
  settings: UserSettings
): WorkoutType | null {
  const slotTypes = new Map((settings.exerciseSlots || []).map((slot) => [slot.id, slot.type]));
  let last: { type: WorkoutType; at: number } | null = null;
  for (const weekLog of Object.values(lifeOS.weekLogs)) {
    for (const c of weekLog.exerciseContract?.completions || []) {
      // Slot ids look like "push-0"; fall back to the prefix if the slot was removed
      const type = slotTypes.get(c.slotId) ?? c.slotId.split("-")[0];
      if (isWorkoutType(type) && (!last || c.completedAt > last.at)) {
        last = { type, at: c.completedAt };
      }
    }
  }
  return last?.type ?? null;
}

/**
 * Suggest the next push/pull/legs workout by rotation: push → legs → pull → push…
 * Starts from the day after the last one completed (push if none yet). If that
 * day's slot is already done this week, moves on to the next day in the rotation.
 * Returns null when all P/P/L slots are done.
 */
export function getSuggestedNextWorkout(
  lifeOS: LifeOS,
  weekKey: string,
  settings: UserSettings
): { type: WorkoutType; slotId: string; lastTrainedAt: number | null } | null {
  const completions = lifeOS.weekLogs[weekKey]?.exerciseContract?.completions || [];
  const completedSlotIds = new Set(completions.map((c) => c.slotId));

  const lastType = getLastCompletedWorkoutType(lifeOS, settings);
  const startIndex = lastType ? (WORKOUT_ROTATION.indexOf(lastType) + 1) % WORKOUT_ROTATION.length : 0;

  for (let i = 0; i < WORKOUT_ROTATION.length; i++) {
    const type = WORKOUT_ROTATION[(startIndex + i) % WORKOUT_ROTATION.length];
    const openSlot = (settings.exerciseSlots || []).find(
      (slot) => slot.type === type && !completedSlotIds.has(slot.id)
    );
    if (openSlot) {
      const lastTrainedAt = getLastSessionOfType(lifeOS, type)?.completedAt ?? null;
      return { type, slotId: openSlot.id, lastTrainedAt };
    }
  }
  return null;
}

export function newSessionId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `ws_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

/** "3d ago" style label for the suggestion card */
export function formatDaysAgo(timestamp: number | null): string {
  if (timestamp === null) return "never trained";
  const days = Math.floor((Date.now() - timestamp) / (24 * 60 * 60 * 1000));
  if (days <= 0) return "today";
  if (days === 1) return "1d ago";
  return `${days}d ago`;
}
