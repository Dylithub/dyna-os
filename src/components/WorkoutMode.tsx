"use client";

// In-workout logging view: shows the template's exercises with last session's
// numbers for progressive overload, and inputs for today's kg/reps/sets.
// The draft lives in local state and only enters LifeOS on FINISH.

import { useState } from "react";
import type {
  WorkoutType,
  WorkoutSession,
  WorkoutTemplateExercise,
  WorkoutExerciseEntry,
} from "@/lib/types";
import TerminalCard from "@/components/TerminalCard";
import TerminalButton from "@/components/TerminalButton";

interface WorkoutModeProps {
  type: WorkoutType;
  template: WorkoutTemplateExercise[];
  lastSession: WorkoutSession | null;
  onFinish: (exercises: WorkoutExerciseEntry[]) => void;
  onCancel: () => void;
}

// Draft rows keep raw strings so inputs can be empty while editing
interface DraftRow {
  name: string;
  kg: string;
  reps: string;
  sets: string;
}

function formatLast(entry: WorkoutExerciseEntry | undefined): string {
  if (!entry) return "LAST: —";
  const kg = entry.kg !== null ? `${entry.kg}kg` : "—";
  const reps = entry.reps !== null ? `${entry.reps}` : "—";
  const sets = entry.sets !== null ? `${entry.sets}` : "—";
  return `LAST: ${kg} × ${reps} × ${sets}`;
}

export default function WorkoutMode({
  type,
  template,
  lastSession,
  onFinish,
  onCancel,
}: WorkoutModeProps) {
  const [draft, setDraft] = useState<DraftRow[]>(() =>
    template.map((ex) => {
      const last = lastSession?.exercises.find((e) => e.name === ex.name);
      return {
        name: ex.name,
        kg:
          last?.kg !== null && last?.kg !== undefined
            ? String(last.kg)
            : ex.startKg !== undefined
            ? String(ex.startKg)
            : "",
        reps:
          last?.reps !== null && last?.reps !== undefined
            ? String(last.reps)
            : ex.targetReps !== undefined
            ? String(ex.targetReps)
            : "",
        sets:
          last?.sets !== null && last?.sets !== undefined
            ? String(last.sets)
            : ex.targetSets !== undefined
            ? String(ex.targetSets)
            : "",
      };
    })
  );

  function setField(index: number, field: "kg" | "reps" | "sets", value: string) {
    setDraft((rows) =>
      rows.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
  }

  function handleFinish() {
    const exercises: WorkoutExerciseEntry[] = draft.map((row) => ({
      name: row.name,
      kg: row.kg !== "" && isFinite(parseFloat(row.kg)) ? parseFloat(row.kg) : null,
      reps: row.reps !== "" && isFinite(parseInt(row.reps)) ? parseInt(row.reps) : null,
      sets: row.sets !== "" && isFinite(parseInt(row.sets)) ? parseInt(row.sets) : null,
    }));
    onFinish(exercises);
  }

  return (
    <TerminalCard title={`${type.toUpperCase()} WORKOUT — IN PROGRESS`} highlight>
      {template.length === 0 && (
        <div className="text-terminal-dim text-xs py-2">
          No exercises in this template. Add them in SETTINGS → WORKOUT TEMPLATES.
        </div>
      )}

      {draft.map((row, i) => {
        const last = lastSession?.exercises.find((e) => e.name === row.name);
        return (
          <div key={i} className="py-2 border-b border-terminal/10">
            <div className="flex justify-between items-baseline mb-1.5">
              <span className="text-terminal text-xs">{row.name}</span>
              <span className="text-terminal-dim text-[10px]">{formatLast(last)}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-terminal-dim text-[10px] block mb-1">KG</label>
                <input
                  type="number"
                  step="0.5"
                  inputMode="decimal"
                  placeholder="kg"
                  value={row.kg}
                  onChange={(e) => setField(i, "kg", e.target.value)}
                  className="!p-2 !text-xs w-full"
                />
              </div>
              <div>
                <label className="text-terminal-dim text-[10px] block mb-1">REPS</label>
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="reps"
                  value={row.reps}
                  onChange={(e) => setField(i, "reps", e.target.value)}
                  className="!p-2 !text-xs w-full"
                />
              </div>
              <div>
                <label className="text-terminal-dim text-[10px] block mb-1">SETS</label>
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="sets"
                  value={row.sets}
                  onChange={(e) => setField(i, "sets", e.target.value)}
                  className="!p-2 !text-xs w-full"
                />
              </div>
            </div>
          </div>
        );
      })}

      <div className="flex flex-wrap gap-2 mt-4">
        <TerminalButton onClick={handleFinish}>FINISH WORKOUT</TerminalButton>
        <TerminalButton onClick={onCancel}>CANCEL</TerminalButton>
      </div>
    </TerminalCard>
  );
}
