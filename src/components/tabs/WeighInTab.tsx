"use client";

// Weigh-in tracking — log weight entries and see trends.
//
// New React concept: useState for local form state.
// The "data" prop holds the persisted LifeOS data.
// But the text in the input fields is "local" state that
// only this component cares about. When the user clicks
// SAVE, we read the local state and push it into the
// persisted data via update().

import { useState } from "react";
import type { LifeOS } from "@/lib/types";
import { getTodayKey, getISOWeekKey } from "@/lib/dates";
import TerminalCard from "@/components/TerminalCard";
import TerminalButton from "@/components/TerminalButton";

interface WeighInTabProps {
  data: LifeOS;
  update: (updater: (current: LifeOS) => LifeOS) => void;
}

export default function WeighInTab({ data, update }: WeighInTabProps) {
  const [weightInput, setWeightInput] = useState("");
  const [dateInput, setDateInput] = useState(getTodayKey());

  const allEntries = [...data.weightEntries].sort((a, b) =>
    b.date.localeCompare(a.date)
  );

  // Calculate weekly trend
  const weeklyWeights: Record<string, { weekKey: string; weightLb: number }> = {};
  data.weightEntries.forEach((entry) => {
    const weekKey = getISOWeekKey(new Date(entry.date));
    if (!weeklyWeights[weekKey] || entry.weightLb < weeklyWeights[weekKey].weightLb) {
      weeklyWeights[weekKey] = { weekKey, weightLb: entry.weightLb };
    }
  });
  const weeklyLowest = Object.values(weeklyWeights)
    .sort((a, b) => b.weekKey.localeCompare(a.weekKey))
    .slice(0, 8);

  function saveWeighIn() {
    const weightLb = parseFloat(weightInput);
    if (!weightLb || !dateInput) {
      alert("Please enter weight and date");
      return;
    }
    update((current) => {
      current.weightEntries.push({ weightLb, date: dateInput });
      current.weightEntries.sort((a, b) => b.date.localeCompare(a.date));
      return { ...current };
    });
    setWeightInput("");
  }

  function deleteEntry(date: string, weightLb: number) {
    update((current) => {
      const idx = current.weightEntries.findIndex(
        (e) => e.date === date && e.weightLb === weightLb
      );
      if (idx !== -1) {
        current.weightEntries.splice(idx, 1);
      }
      return { ...current };
    });
  }

  // Build trend display
  let trendContent: React.ReactNode;
  if (weeklyLowest.length >= 2) {
    const weights = weeklyLowest.map((w) => w.weightLb).reverse();
    const firstWeight = weights[0];
    const lastWeight = weights[weights.length - 1];
    const diff = lastWeight - firstWeight;
    const arrow = diff > 0 ? "\u2191" : diff < 0 ? "\u2193" : "\u2192";
    const colorClass = diff > 0 ? "text-terminal-warning" : diff < 0 ? "text-terminal" : "text-terminal-dim";

    trendContent = (
      <div className="text-center">
        <span className={`${colorClass} text-2xl`}>{arrow}</span>
        <span className={`${colorClass} text-sm ml-2`}>
          {Math.abs(diff).toFixed(1)} lbs{" "}
          {diff > 0 ? "gained" : diff < 0 ? "lost" : "no change"}
        </span>
        <div className="mt-2.5 text-[11px] text-terminal-dim">
          Over {weeklyLowest.length} weeks
        </div>
      </div>
    );
  } else {
    trendContent = (
      <div className="text-terminal-dim">Need 2+ weeks for trend.</div>
    );
  }

  return (
    <>
      <div className="text-base text-terminal-bright tracking-widest mb-4 pb-2.5 border-b border-terminal-border">
        WEIGH-IN
      </div>

      <TerminalCard title="LOG WEIGHT">
        <div className="mb-4">
          <label className="text-terminal-dim text-[11px] block mb-1 tracking-wider">
            WEIGHT (LBS)
          </label>
          <input
            type="number"
            step="0.1"
            placeholder="e.g., 185.5"
            value={weightInput}
            onChange={(e) => setWeightInput(e.target.value)}
          />
        </div>
        <div className="mb-4">
          <label className="text-terminal-dim text-[11px] block mb-1 tracking-wider">
            DATE
          </label>
          <input
            type="date"
            value={dateInput}
            onChange={(e) => setDateInput(e.target.value)}
          />
        </div>
        <TerminalButton onClick={saveWeighIn}>SAVE</TerminalButton>
      </TerminalCard>

      <TerminalCard title="TREND">{trendContent}</TerminalCard>

      <TerminalCard title="RECENT ENTRIES">
        {allEntries.length > 0 ? (
          allEntries.slice(0, 10).map((entry) => (
            <div
              key={`${entry.date}-${entry.weightLb}`}
              className="flex justify-between items-center py-2 border-b border-terminal/10 flex-wrap gap-1"
            >
              <span className="text-terminal-dim text-xs">{entry.date}</span>
              <span className="text-terminal text-xs">{entry.weightLb} lbs</span>
              <TerminalButton small onClick={() => deleteEntry(entry.date, entry.weightLb)}>
                X
              </TerminalButton>
            </div>
          ))
        ) : (
          <div className="text-terminal-dim">No entries yet.</div>
        )}
      </TerminalCard>
    </>
  );
}
