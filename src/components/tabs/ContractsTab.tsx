"use client";

// Weekly exercise contracts — Zone 2 cardio + strength training.
// The key React concept here: when a checkbox changes, we call
// update() which modifies the data and triggers a re-render.
// React handles redrawing the UI automatically.

import type { LifeOS } from "@/lib/types";
import { getISOWeekKey } from "@/lib/dates";
import TerminalCard from "@/components/TerminalCard";

interface ContractsTabProps {
  data: LifeOS;
  update: (updater: (current: LifeOS) => LifeOS) => void;
}

export default function ContractsTab({ data, update }: ContractsTabProps) {
  const weekKey = getISOWeekKey();
  const weekLog = data.weekLogs[weekKey];
  const ec = weekLog?.exerciseContract;

  const zone2Done = ec?.zone2Done || 0;
  const strengthDone =
    (ec?.strength?.armsChest ? 1 : 0) +
    (ec?.strength?.legs ? 1 : 0) +
    (ec?.strength?.coreBack ? 1 : 0);
  const totalSessions = zone2Done + strengthDone;

  function toggleZone2(sessionNum: number) {
    update((current) => {
      const ec = current.weekLogs[weekKey].exerciseContract;
      const currentDone = ec.zone2Done || 0;
      // If clicking a checked session, uncheck it and all after it.
      // If clicking an unchecked session, check it and all before it.
      ec.zone2Done = sessionNum <= currentDone ? sessionNum - 1 : sessionNum;
      return { ...current };
    });
  }

  function toggleStrength(type: "armsChest" | "legs" | "coreBack") {
    update((current) => {
      const ec = current.weekLogs[weekKey].exerciseContract;
      ec.strength[type] = !ec.strength[type];
      return { ...current };
    });
  }

  return (
    <>
      <div className="text-base text-terminal-bright tracking-widest mb-4 pb-2.5 border-b border-terminal-border">
        WEEKLY CONTRACTS - {weekKey}
      </div>

      <TerminalCard title="PROGRESS">
        <div className="flex justify-between items-center py-2">
          <span className="text-terminal-dim text-xs">TOTAL</span>
          <span className={`text-xs ${totalSessions >= 7 ? "text-terminal-bright" : "text-terminal"}`}>
            {totalSessions} / 7 sessions
          </span>
        </div>
      </TerminalCard>

      <TerminalCard title={`ZONE 2 CARDIO (4 x ${ec?.zone2MinutesEach || 40} min)`}>
        <div className="flex flex-col gap-3 mt-2">
          {[1, 2, 3, 4].map((i) => (
            <label key={i} className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={i <= zone2Done}
                onChange={() => toggleZone2(i)}
              />
              <span className={i <= zone2Done ? "text-terminal" : "text-terminal-dim"}>
                Session {i}
              </span>
            </label>
          ))}
        </div>
      </TerminalCard>

      <TerminalCard title="STRENGTH (3 sessions)">
        <div className="flex flex-col gap-3 mt-2">
          {([
            ["armsChest", "Arms"],
            ["legs", "Legs"],
            ["coreBack", "Core / Back / Chest"],
          ] as const).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={ec?.strength?.[key] || false}
                onChange={() => toggleStrength(key)}
              />
              <span className={ec?.strength?.[key] ? "text-terminal" : "text-terminal-dim"}>
                {label}
              </span>
            </label>
          ))}
        </div>
      </TerminalCard>
    </>
  );
}
