"use client";

// Weekly exercise contracts — Zone 2 cardio + strength training.
// The key React concept here: when a checkbox changes, we call
// update() which modifies the data and triggers a re-render.
// React handles redrawing the UI automatically.

import type { LifeOS } from "@/lib/types";
import { getISOWeekKey } from "@/lib/dates";
import { getSettings } from "@/lib/storage";
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

  const zone2Done = ec?.zone2Done || 0;

  // Get strength completion - use new format if available, otherwise legacy
  function getStrengthDoneArray(): boolean[] {
    if (ec?.strengthDone && ec.strengthDone.length > 0) {
      return ec.strengthDone;
    }
    // Convert legacy format to array
    if (ec?.strength) {
      return [
        ec.strength.armsChest || false,
        ec.strength.legs || false,
        ec.strength.coreBack || false,
      ];
    }
    return [];
  }

  const strengthDoneArray = getStrengthDoneArray();
  const strengthDoneCount = strengthDoneArray.filter(Boolean).length;
  const totalSessions = zone2Done + strengthDoneCount;
  const totalTarget = settings.zone2Sessions + settings.strengthSessions;

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

  function toggleStrength(index: number) {
    update((current) => {
      const ec = current.weekLogs[weekKey].exerciseContract;

      // Initialize strengthDone array if needed
      if (!ec.strengthDone || ec.strengthDone.length === 0) {
        // Convert from legacy format
        ec.strengthDone = [
          ec.strength?.armsChest || false,
          ec.strength?.legs || false,
          ec.strength?.coreBack || false,
        ];
      }

      // Ensure array has enough slots
      while (ec.strengthDone.length < settings.strengthSessions) {
        ec.strengthDone.push(false);
      }

      // Toggle the specific index
      ec.strengthDone[index] = !ec.strengthDone[index];

      return { ...current };
    });
  }

  return (
    <>
      <div className="text-base text-terminal-bright tracking-widest mb-4 pb-2.5 border-b border-terminal-border">
        WEEKLY EXERCISE - {weekKey}
      </div>

      <TerminalCard title="PROGRESS">
        <div className="flex justify-between items-center py-2">
          <span className="text-terminal-dim text-xs">TOTAL</span>
          <span className={`text-xs ${totalSessions >= totalTarget ? "text-terminal-bright" : "text-terminal"}`}>
            {totalSessions} / {totalTarget} sessions
          </span>
        </div>
      </TerminalCard>

      <TerminalCard title={`ZONE 2 CARDIO (${settings.zone2Sessions} x ${settings.zone2Minutes} min)`}>
        <div className="flex flex-col gap-3 mt-2">
          {Array.from({ length: settings.zone2Sessions }, (_, i) => i + 1).map((i) => (
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

      <TerminalCard title={`STRENGTH (${settings.strengthSessions} sessions)`}>
        <div className="flex flex-col gap-3 mt-2">
          {Array.from({ length: settings.strengthSessions }, (_, i) => {
            const isChecked = strengthDoneArray[i] || false;
            const label = settings.strengthLabels[i] || `Session ${i + 1}`;
            return (
              <label key={i} className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleStrength(i)}
                />
                <span className={isChecked ? "text-terminal" : "text-terminal-dim"}>
                  {label}
                </span>
              </label>
            );
          })}
        </div>
      </TerminalCard>
    </>
  );
}
