"use client";

// Edit the weekly plan (the session slots ticked off each week) and the
// push/pull/legs routines: rename, reorder, add, remove, and set target
// sets/reps and a starting weight. Saved in settings, so it syncs.
//
// WorkoutMode prefills each exercise from the last session by name, so a
// rename also renames that exercise in past sessions of the same type —
// otherwise its "LAST" weights would be lost.

import { useState } from "react";
import type { LifeOS, ExerciseSlot, WorkoutType, WorkoutTemplateExercise } from "@/lib/types";
import { getSettings } from "@/lib/storage";
import TerminalCard from "@/components/TerminalCard";
import TerminalButton from "@/components/TerminalButton";
import NumberInput from "@/components/NumberInput";

interface RoutineEditorProps {
  data: LifeOS;
  update: (updater: (current: LifeOS) => LifeOS) => void;
  onDone: () => void;
}

// Name field that commits on blur, so a rename is one change (and one history rename)
function NameInput({
  value,
  onCommit,
  placeholder = "Exercise name",
}: {
  value: string;
  onCommit: (name: string) => void;
  placeholder?: string;
}) {
  const [local, setLocal] = useState(value);
  const [focused, setFocused] = useState(false);
  return (
    <input
      type="text"
      value={focused ? local : value}
      placeholder={placeholder}
      onFocus={() => {
        setFocused(true);
        setLocal(value);
      }}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => {
        setFocused(false);
        const name = local.trim();
        if (name !== value) onCommit(name);
      }}
      className="!p-2 !text-xs w-full"
    />
  );
}

const TYPES: WorkoutType[] = ["push", "legs", "pull"];
const SLOT_TYPES: ExerciseSlot["type"][] = ["cardio", "push", "legs", "pull", "custom"];

export default function RoutineEditor({ data, update, onDone }: RoutineEditorProps) {
  const settings = getSettings(data);
  const templates = settings.workoutTemplates!; // getSettings backfills defaults
  const slots = settings.exerciseSlots;

  // Weekly plan edits. The weekly target follows the number of sessions planned.
  // Slot ids never change once made — this week's ticks and past history point at them.
  function setSlots(change: (list: ExerciseSlot[]) => ExerciseSlot[]) {
    update((current) => {
      const s = getSettings(current);
      const next = change([...s.exerciseSlots]);
      return { ...current, settings: { ...s, exerciseSlots: next, exerciseTarget: next.length } };
    });
  }

  function moveSlot(index: number, direction: -1 | 1) {
    setSlots((list) => {
      const target = index + direction;
      if (target < 0 || target >= list.length) return list;
      [list[index], list[target]] = [list[target], list[index]];
      return list;
    });
  }

  function addSlot(type: ExerciseSlot["type"]) {
    setSlots((list) => {
      // Ids look like "push-1"; take the next free number for this type
      let n = 0;
      while (list.some((slot) => slot.id === `${type}-${n}`)) n++;
      const label = type === "custom" ? "Session" : type.charAt(0).toUpperCase() + type.slice(1);
      return [...list, { id: `${type}-${n}`, label, type }];
    });
  }

  function setExercises(
    type: WorkoutType,
    change: (exercises: WorkoutTemplateExercise[]) => WorkoutTemplateExercise[]
  ) {
    update((current) => {
      const settings = getSettings(current);
      const all = settings.workoutTemplates!;
      return {
        ...current,
        settings: { ...settings, workoutTemplates: { ...all, [type]: change([...all[type]]) } },
      };
    });
  }

  function patch(type: WorkoutType, index: number, fields: Partial<WorkoutTemplateExercise>) {
    setExercises(type, (list) => list.map((ex, i) => (i === index ? { ...ex, ...fields } : ex)));
  }

  function move(type: WorkoutType, index: number, direction: -1 | 1) {
    setExercises(type, (list) => {
      const target = index + direction;
      if (target < 0 || target >= list.length) return list;
      [list[index], list[target]] = [list[target], list[index]];
      return list;
    });
  }

  function rename(type: WorkoutType, index: number, newName: string) {
    const oldName = templates[type][index].name;
    update((current) => {
      const settings = getSettings(current);
      const all = settings.workoutTemplates!;
      const list = all[type].map((ex, i) => (i === index ? { ...ex, name: newName } : ex));
      // Carry the exercise's history over to the new name
      if (oldName && newName) {
        for (const weekLog of Object.values(current.weekLogs)) {
          for (const session of weekLog.workoutSessions || []) {
            if (session.type !== type) continue;
            for (const entry of session.exercises) {
              if (entry.name === oldName) entry.name = newName;
            }
          }
        }
      }
      return { ...current, settings: { ...settings, workoutTemplates: { ...all, [type]: list } } };
    });
  }

  return (
    <TerminalCard title="EDIT ROUTINES" highlight>
      <div className="text-terminal-dim text-[10px] mb-4">
        Changes save as you go. Renaming keeps that exercise&apos;s last weights.
      </div>

      <div className="mb-6">
        <div className="text-terminal-bright text-[11px] mb-1 tracking-wider">WEEKLY PLAN</div>
        <div className="text-terminal-dim text-[10px] mb-2">
          The sessions you tick off each week ({slots.length} = weekly target)
        </div>
        <div className="flex flex-col gap-2">
          {slots.map((slot, i) => (
            <div key={slot.id} className="border-b border-terminal/10 pb-2">
              <div className="flex gap-2 items-center">
                <NameInput
                  value={slot.label}
                  placeholder="Session name"
                  onCommit={(label) =>
                    setSlots((list) => list.map((s, j) => (j === i ? { ...s, label: label || s.label } : s)))
                  }
                />
                <span className="text-terminal-dim text-[9px] tracking-wider w-12 text-right shrink-0">
                  {slot.type.toUpperCase()}
                </span>
              </div>
              <div className="flex gap-2 mt-1.5">
                <TerminalButton small onClick={() => moveSlot(i, -1)}>
                  ▲ UP
                </TerminalButton>
                <TerminalButton small onClick={() => moveSlot(i, 1)}>
                  ▼ DOWN
                </TerminalButton>
                <button
                  onClick={() => setSlots((list) => list.filter((_, j) => j !== i))}
                  className="ml-auto text-terminal-warning text-[10px] tracking-wider min-h-[32px] px-2 cursor-pointer"
                  aria-label={`Remove ${slot.label}`}
                >
                  ✕ REMOVE
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="text-terminal-dim text-[10px] mt-3 mb-1.5">ADD A SESSION</div>
        <div className="flex flex-wrap gap-2">
          {SLOT_TYPES.map((type) => (
            <TerminalButton key={type} small onClick={() => addSlot(type)}>
              + {type.toUpperCase()}
            </TerminalButton>
          ))}
        </div>
      </div>

      {TYPES.map((type) => (
        <div key={type} className="mb-5">
          <div className="text-terminal-bright text-[11px] mb-2 tracking-wider">
            {type.toUpperCase()} DAY
          </div>
          <div className="grid grid-cols-[1fr_40px_40px_48px] gap-1.5 items-center mb-1">
            <div className="text-terminal-dim text-[9px]">EXERCISE</div>
            <div className="text-terminal-dim text-[9px]">SETS</div>
            <div className="text-terminal-dim text-[9px]">REPS</div>
            <div className="text-terminal-dim text-[9px]">START KG</div>
          </div>

          <div className="flex flex-col gap-3">
            {templates[type].map((ex, i) => (
              <div key={`${type}-${i}-${ex.name}`} className="border-b border-terminal/10 pb-2">
                <div className="grid grid-cols-[1fr_40px_40px_48px] gap-1.5 items-center">
                  <NameInput value={ex.name} onCommit={(name) => rename(type, i, name)} />
                  <NumberInput
                    value={ex.targetSets ?? 3}
                    onChange={(val) => patch(type, i, { targetSets: val })}
                    className="!p-2 !text-xs w-full"
                    min={1}
                  />
                  <NumberInput
                    value={ex.targetReps ?? 10}
                    onChange={(val) => patch(type, i, { targetReps: val })}
                    className="!p-2 !text-xs w-full"
                    min={1}
                  />
                  <NumberInput
                    value={ex.startKg ?? 0}
                    onChange={(val) => patch(type, i, { startKg: val > 0 ? val : undefined })}
                    className="!p-2 !text-xs w-full"
                    decimal
                  />
                </div>
                <div className="flex gap-2 mt-1.5">
                  <TerminalButton small onClick={() => move(type, i, -1)}>
                    ▲ UP
                  </TerminalButton>
                  <TerminalButton small onClick={() => move(type, i, 1)}>
                    ▼ DOWN
                  </TerminalButton>
                  <button
                    onClick={() => setExercises(type, (list) => list.filter((_, j) => j !== i))}
                    className="ml-auto text-terminal-warning text-[10px] tracking-wider min-h-[32px] px-2 cursor-pointer"
                    aria-label={`Remove ${ex.name || "exercise"}`}
                  >
                    ✕ REMOVE
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-2">
            <TerminalButton
              small
              onClick={() =>
                setExercises(type, (list) => [...list, { name: "", targetSets: 3, targetReps: 10 }])
              }
            >
              + ADD EXERCISE
            </TerminalButton>
          </div>
        </div>
      ))}

      <TerminalButton onClick={onDone}>DONE</TerminalButton>
    </TerminalCard>
  );
}
