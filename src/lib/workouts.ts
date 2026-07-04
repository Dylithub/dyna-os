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

/**
 * Suggest the next push/pull/legs workout: among types that still have an
 * uncompleted slot this week, pick the least-recently-trained (never-trained first).
 * Returns null when all P/P/L slots are done.
 */
export function getSuggestedNextWorkout(
  lifeOS: LifeOS,
  weekKey: string,
  settings: UserSettings
): { type: WorkoutType; slotId: string; lastTrainedAt: number | null } | null {
  const completions = lifeOS.weekLogs[weekKey]?.exerciseContract?.completions || [];
  const completedSlotIds = new Set(completions.map((c) => c.slotId));

  let best: { type: WorkoutType; slotId: string; lastTrainedAt: number | null } | null = null;
  for (const type of WORKOUT_TYPES) {
    const openSlot = (settings.exerciseSlots || []).find(
      (slot) => slot.type === type && !completedSlotIds.has(slot.id)
    );
    if (!openSlot) continue;
    const lastTrainedAt = getLastSessionOfType(lifeOS, type)?.completedAt ?? null;
    if (
      !best ||
      (lastTrainedAt === null && best.lastTrainedAt !== null) ||
      (lastTrainedAt !== null && best.lastTrainedAt !== null && lastTrainedAt < best.lastTrainedAt)
    ) {
      best = { type, slotId: openSlot.id, lastTrainedAt };
    }
  }
  return best;
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
