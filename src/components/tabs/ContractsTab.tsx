"use client";

// Weekly exercise contracts using ordered completion model.
// Each completed exercise stores its sequence number (1-7).
// When one is cleared, remaining are renumbered to stay continuous.
//
// Push/pull/legs slots additionally support full workout logging:
// START opens WorkoutMode (kg/reps/sets per exercise, prefilled from the
// last session of that type for progressive overload); FINISH stores a
// WorkoutSession on the week and marks the slot complete via the same
// completions mechanism the checkboxes use.

import { useState } from "react";
import type { LifeOS, ExerciseCompletion, WorkoutType, WorkoutExerciseEntry } from "@/lib/types";
import { getISOWeekKey } from "@/lib/dates";
import { getSettings, ensureWeekLog } from "@/lib/storage";
import {
  getLastSessionOfType,
  getSessionForSlot,
  getSuggestedNextWorkout,
  isWorkoutType,
  newSessionId,
  formatDaysAgo,
} from "@/lib/workouts";
import TerminalCard from "@/components/TerminalCard";
import TerminalButton from "@/components/TerminalButton";
import WorkoutMode from "@/components/WorkoutMode";

interface ContractsTabProps {
  data: LifeOS;
  update: (updater: (current: LifeOS) => LifeOS) => void;
}

export default function ContractsTab({ data, update }: ContractsTabProps) {
  const settings = getSettings(data);
  const weekKey = getISOWeekKey();
  const weekLog = data.weekLogs[weekKey];
  const ec = weekLog?.exerciseContract;

  const [activeWorkout, setActiveWorkout] = useState<{
    slotId: string;
    type: WorkoutType;
  } | null>(null);
  const [viewingSlotId, setViewingSlotId] = useState<string | null>(null);

  // Get completions array (use new model or empty)
  const completions: ExerciseCompletion[] = ec?.completions || [];

  // Get the display number for a slot (1-indexed position in completion order)
  function getDisplayNumber(slotId: string): number | null {
    const sorted = [...completions].sort((a, b) => a.completedAt - b.completedAt);
    const index = sorted.findIndex((c) => c.slotId === slotId);
    return index >= 0 ? index + 1 : null;
  }

  // Count total sessions
  const totalSessions = completions.length;
  const totalTarget = settings.exerciseTarget || 7;

  const suggestion = getSuggestedNextWorkout(data, weekKey, settings);

  // Toggle a slot: if empty, add; if filled, remove and renumber
  function toggleSlot(slotId: string) {
    update((current) => {
      const updated = ensureWeekLog(current, weekKey);
      const wl = updated.weekLogs[weekKey];
      if (!wl || !wl.exerciseContract) return current;

      const ec = { ...wl.exerciseContract };
      const newCompletions: ExerciseCompletion[] = [...(ec.completions || [])];

      const existingIndex = newCompletions.findIndex((c) => c.slotId === slotId);

      if (existingIndex >= 0) {
        // CLEAR: Remove this completion
        newCompletions.splice(existingIndex, 1);
        // No need to renumber - the display order is derived from completedAt timestamps
        // Also drop any logged workout session for this slot so completion
        // and session stay paired (no ghost "last weights" from cleared slots)
        wl.workoutSessions = (wl.workoutSessions || []).filter(
          (s) => s.slotId !== slotId
        );
      } else {
        // ADD: Only if under max
        if (newCompletions.length >= 7) {
          return current; // Already at max
        }
        newCompletions.push({
          slotId,
          completedAt: Date.now(),
        });
      }

      ec.completions = newCompletions;

      // Update legacy fields for backwards compatibility
      ec.zone2Done = newCompletions.filter((c) => c.slotId.startsWith("cardio")).length;

      wl.exerciseContract = ec;
      return { ...updated };
    });
  }

  // Save a finished workout: store the session and mark the slot complete
  function finishWorkout(slotId: string, type: WorkoutType, exercises: WorkoutExerciseEntry[]) {
    update((current) => {
      const updated = ensureWeekLog(current, weekKey);
      const wl = updated.weekLogs[weekKey];
      if (!wl || !wl.exerciseContract) return current;

      // One session per slot per week — guards against double-submits
      if ((wl.workoutSessions || []).some((s) => s.slotId === slotId)) {
        return current;
      }

      const now = Date.now();
      wl.workoutSessions = [
        ...(wl.workoutSessions || []),
        { id: newSessionId(), slotId, type, completedAt: now, exercises },
      ];

      const ec = { ...wl.exerciseContract };
      const newCompletions: ExerciseCompletion[] = [...(ec.completions || [])];
      if (!newCompletions.some((c) => c.slotId === slotId) && newCompletions.length < 7) {
        newCompletions.push({ slotId, completedAt: now });
      }
      ec.completions = newCompletions;
      ec.zone2Done = newCompletions.filter((c) => c.slotId.startsWith("cardio")).length;
      wl.exerciseContract = ec;
      return { ...updated };
    });
    setActiveWorkout(null);
  }

  // Get exercise slots from settings
  const exerciseSlots = settings.exerciseSlots || [];

  // ── In-workout view ──────────────────────────────────────────
  if (activeWorkout) {
    const template = settings.workoutTemplates?.[activeWorkout.type] || [];
    const lastSession = getLastSessionOfType(data, activeWorkout.type);
    return (
      <>
        <div className="text-base text-terminal-bright tracking-widest mb-4 pb-2.5 border-b border-terminal-border">
          WEEKLY EXERCISE - {weekKey}
        </div>
        <WorkoutMode
          type={activeWorkout.type}
          template={template}
          lastSession={lastSession}
          onFinish={(exercises) =>
            finishWorkout(activeWorkout.slotId, activeWorkout.type, exercises)
          }
          onCancel={() => setActiveWorkout(null)}
        />
      </>
    );
  }

  return (
    <>
      <div className="text-base text-terminal-bright tracking-widest mb-4 pb-2.5 border-b border-terminal-border">
        WEEKLY EXERCISE - {weekKey}
      </div>

      {suggestion && totalSessions < 7 && (
        <TerminalCard title="SUGGESTED NEXT" highlight>
          <div className="flex justify-between items-center gap-2">
            <div>
              <span className="text-terminal-bright text-sm tracking-wider">
                {suggestion.type.toUpperCase()}
              </span>
              <span className="text-terminal-dim text-[10px] ml-2">
                {formatDaysAgo(suggestion.lastTrainedAt)}
              </span>
            </div>
            <TerminalButton
              small
              onClick={() =>
                setActiveWorkout({ slotId: suggestion.slotId, type: suggestion.type })
              }
            >
              START ▶
            </TerminalButton>
          </div>
        </TerminalCard>
      )}

      <TerminalCard title="PROGRESS">
        <div className="flex justify-between items-center py-2">
          <span className="text-terminal-dim text-xs">TOTAL</span>
          <span className={totalSessions >= totalTarget ? "text-xs text-terminal-bright" : "text-xs text-terminal"}>
            {totalSessions} / {totalTarget} sessions
          </span>
        </div>
        <div className="flex gap-2 mt-2 flex-wrap">
          {Array(totalTarget).fill(0).map((_, i) => (
            <div
              key={i}
              className={i < totalSessions ? "w-6 h-6 border border-terminal bg-terminal" : "w-6 h-6 border border-terminal-border bg-transparent"}
            />
          ))}
        </div>
      </TerminalCard>

      <TerminalCard title="EXERCISE SLOTS">
        <div className="flex flex-col gap-3 mt-2">
          {exerciseSlots.map((slot) => {
            const displayNum = getDisplayNumber(slot.id);
            const isDone = displayNum !== null;
            const canLogWorkout = isWorkoutType(slot.type);
            const session = canLogWorkout ? getSessionForSlot(data, weekKey, slot.id) : null;
            const isViewing = viewingSlotId === slot.id;
            return (
              <div key={slot.id}>
                <div className="flex items-center gap-2.5">
                  <span
                    onClick={() => toggleSlot(slot.id)}
                    className={isDone
                      ? "w-6 h-6 flex items-center justify-center border text-xs font-bold cursor-pointer select-none bg-terminal/20 border-terminal text-terminal"
                      : "w-6 h-6 flex items-center justify-center border text-xs font-bold cursor-pointer select-none border-terminal-dim text-terminal-dim hover:border-terminal/50"
                    }
                  >
                    {isDone ? displayNum : ""}
                  </span>
                  <span
                    onClick={() => toggleSlot(slot.id)}
                    className={`flex-1 cursor-pointer ${isDone ? "text-terminal" : "text-terminal-dim"}`}
                  >
                    {slot.label}
                  </span>
                  {canLogWorkout && !isDone && totalSessions < 7 && (
                    <TerminalButton
                      small
                      onClick={() =>
                        setActiveWorkout({ slotId: slot.id, type: slot.type as WorkoutType })
                      }
                    >
                      START
                    </TerminalButton>
                  )}
                  {session && (
                    <TerminalButton
                      small
                      active={isViewing}
                      onClick={() => setViewingSlotId(isViewing ? null : slot.id)}
                    >
                      VIEW
                    </TerminalButton>
                  )}
                </div>
                {isViewing && session && (
                  <div className="ml-8 mt-2 mb-1 border-l border-terminal/20 pl-3">
                    {session.exercises.map((e, i) => (
                      <div key={i} className="flex justify-between py-0.5">
                        <span className="text-terminal-dim text-[10px]">{e.name}</span>
                        <span className="text-terminal text-[10px]">
                          {e.kg !== null ? `${e.kg}kg` : "—"} × {e.reps ?? "—"} × {e.sets ?? "—"}
                        </span>
                      </div>
                    ))}
                    {session.exercises.length === 0 && (
                      <div className="text-terminal-dim text-[10px] py-0.5">No exercises logged</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </TerminalCard>

      {totalSessions >= totalTarget && (
        <TerminalCard title="WEEK COMPLETE">
          <div className="text-terminal-bright text-center py-2">
            All {totalTarget} sessions completed!
          </div>
        </TerminalCard>
      )}
    </>
  );
}
