"use client";

// Daily check-in — rate mood, energy, and calm on a 1-5 scale.
//
// The scale buttons show an important React pattern: "lifting state up".
// The button click doesn't manage its own state — it calls update()
// which modifies the LifeOS data, and React re-renders everything
// with the new values. This is why the "active" button highlights
// correctly — it's driven by the data, not by local button state.

import { useState } from "react";
import type { LifeOS } from "@/lib/types";
import { getTodayKey } from "@/lib/dates";
import { ensureDayLog } from "@/lib/storage";
import TerminalCard from "@/components/TerminalCard";
import TerminalButton from "@/components/TerminalButton";

interface CheckInTabProps {
  data: LifeOS;
  update: (updater: (current: LifeOS) => LifeOS) => void;
}

export default function CheckInTab({ data, update }: CheckInTabProps) {
  const todayKey = getTodayKey();
  const checkIn = data.dayLogs[todayKey]?.checkIn;
  const [noteValue, setNoteValue] = useState(checkIn?.note || "");

  function setScale(field: "mood" | "energy" | "stress", value: number) {
    update((current) => {
      const updated = ensureDayLog(current);
      updated.dayLogs[todayKey].checkIn[field] = value;
      return { ...updated };
    });
  }

  function saveNote() {
    update((current) => {
      const updated = ensureDayLog(current);
      updated.dayLogs[todayKey].checkIn.note = noteValue;
      return { ...updated };
    });
  }

  const scales = [
    { name: "MOOD", field: "mood" as const, value: checkIn?.mood, hint: "1 = low | 5 = great" },
    { name: "ENERGY", field: "energy" as const, value: checkIn?.energy, hint: "1 = exhausted | 5 = high" },
    { name: "CALM", field: "stress" as const, value: checkIn?.stress, hint: "1 = stressed | 5 = calm" },
  ];

  return (
    <>
      <div className="text-base text-terminal-bright tracking-widest mb-4 pb-2.5 border-b border-terminal-border">
        DAILY CHECK-IN
      </div>

      <TerminalCard title="HOW ARE YOU TODAY?">
        {scales.map(({ name, field, value, hint }) => (
          <div key={name} className="mb-4">
            <label className="text-terminal-dim text-[11px] block mb-1 tracking-wider">
              {name}
            </label>
            <div className="text-terminal-dim text-[10px] mb-2">{hint}</div>
            <div className="flex gap-2 flex-wrap">
              {[1, 2, 3, 4, 5].map((n) => (
                <TerminalButton
                  key={n}
                  onClick={() => setScale(field, n)}
                  active={value === n}
                  className="min-w-[44px] flex-1"
                >
                  {n}
                </TerminalButton>
              ))}
            </div>
          </div>
        ))}

      </TerminalCard>

      {checkIn?.mood !== null && checkIn?.mood !== undefined && (
        <TerminalCard title="TODAY'S SUMMARY">
          {[
            { label: "MOOD", value: checkIn.mood },
            { label: "ENERGY", value: checkIn.energy },
            { label: "CALM", value: checkIn.stress },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="flex justify-between items-center py-2 border-b border-terminal/10"
            >
              <span className="text-terminal-dim text-xs">{label}</span>
              <span className="text-terminal text-xs">{value}/5</span>
            </div>
          ))}
        </TerminalCard>
      )}
    </>
  );
}
