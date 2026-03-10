"use client";

// Weekly exercise contracts using ordered completion model.
// Each completed exercise stores its sequence number (1-7).
// When one is cleared, remaining are renumbered to stay continuous.

import type { LifeOS, ExerciseCompletion } from "@/lib/types";
import { getISOWeekKey } from "@/lib/dates";
import { getSettings, ensureWeekLog } from "@/lib/storage";
import TerminalCard from "@/components/TerminalCard";

interface ContractsTabProps {
  data: LifeOS;
  update: (updater: (current: LifeOS) => LifeOS) => void;
}

export default function ContractsTab({ data, update }: ContractsTabProps) {
  const settings = getSettings(data);
  const weekKey = getISOWeekKey();
  const weekLog = data.weekLogs[weekKey];
  const ec = weekLog?.exerciseContract;

  // Get completions array (use new model or empty)
  const completions: ExerciseCompletion[] = ec?.completions || [];

  // Get the display number for a slot (1-indexed position in completion order)
  function getDisplayNumber(slotId: string): number | null {
    const sorted = [...completions].sort((a, b) => a.completedAt - b.completedAt);
    const index = sorted.findIndex((c) => c.slotId === slotId);
    return index >= 0 ? index + 1 : null;
  }

  // Check if a slot is completed
  function isSlotCompleted(slotId: string): boolean {
    return completions.some((c) => c.slotId === slotId);
  }

  // Count total sessions
  const totalSessions = completions.length;
  const totalTarget = settings.exerciseTarget || 7;

  // Toggle a slot: if empty, add; if filled, remove and renumber
  function toggleSlot(slotId: string) {
    update((current) => {
      let updated = ensureWeekLog(current, weekKey);
      const wl = updated.weekLogs[weekKey];
      if (!wl || !wl.exerciseContract) return current;

      const ec = { ...wl.exerciseContract };
      let newCompletions: ExerciseCompletion[] = [...(ec.completions || [])];

      const existingIndex = newCompletions.findIndex((c) => c.slotId === slotId);

      if (existingIndex >= 0) {
        // CLEAR: Remove this completion
        newCompletions.splice(existingIndex, 1);
        // No need to renumber - the display order is derived from completedAt timestamps
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

  // Get exercise slots from settings
  const exerciseSlots = settings.exerciseSlots || [];

  return (
    <>
      <div className="text-base text-terminal-bright tracking-widest mb-4 pb-2.5 border-b border-terminal-border">
        WEEKLY EXERCISE - {weekKey}
      </div>

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
            return (
              <label key={slot.id} className="flex items-center gap-2.5 cursor-pointer">
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
                  className={isDone ? "text-terminal" : "text-terminal-dim"}
                >
                  {slot.label}
                </span>
              </label>
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
