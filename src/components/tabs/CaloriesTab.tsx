"use client";

// Weekly nutrition grid — enter calories and protein for each day.
//
// This component shows the "controlled input" pattern in React:
// The input values are driven by the data (not the other way around).
// When you type, the onChange handler updates the data, which causes
// React to re-render with the new value in the input. This keeps
// the UI and data always in sync.

import type { LifeOS } from "@/lib/types";
import { getThisWeekNutrition, ensureDayLog } from "@/lib/storage";
import TerminalCard from "@/components/TerminalCard";

interface CaloriesTabProps {
  data: LifeOS;
  update: (updater: (current: LifeOS) => LifeOS) => void;
}

export default function CaloriesTab({ data, update }: CaloriesTabProps) {
  const thisWeekNutrition = getThisWeekNutrition(data);
  const loggedDays = thisWeekNutrition.filter((d) => d.calories !== null);
  const avgCalories =
    loggedDays.length > 0
      ? Math.round(
          loggedDays.reduce((sum, d) => sum + (d.calories || 0), 0) /
            loggedDays.length
        )
      : 0;
  const avgProtein =
    loggedDays.length > 0
      ? Math.round(
          loggedDays.reduce((sum, d) => sum + (d.protein || 0), 0) /
            loggedDays.length
        )
      : 0;

  function saveNutrition(dateKey: string, field: "calories" | "protein", value: string) {
    update((current) => {
      const updated = ensureDayLog(current, dateKey);
      if (!updated.dayLogs[dateKey].nutrition) {
        updated.dayLogs[dateKey].nutrition = { calories: null, protein: null };
      }
      updated.dayLogs[dateKey].nutrition[field] = value ? parseInt(value) : null;
      return { ...updated };
    });
  }

  return (
    <>
      <div className="text-base text-terminal-bright tracking-widest mb-4 pb-2.5 border-b border-terminal-border">
        CALORIES &amp; PROTEIN
      </div>

      <TerminalCard title={`THIS WEEK (${loggedDays.length}/7)`}>
        {/* Column headers */}
        <div className="grid grid-cols-[60px_1fr_1fr] gap-2 items-center mb-2">
          <div className="text-terminal-dim text-[10px]">DAY</div>
          <div className="text-terminal-dim text-[10px]">KCAL</div>
          <div className="text-terminal-dim text-[10px]">PROTEIN</div>
        </div>
        {thisWeekNutrition.map((day) => (
          <div
            key={day.date}
            className={`grid grid-cols-[60px_1fr_1fr] gap-2 items-center ${
              day.isToday ? "bg-terminal-card-highlight p-1.5 rounded" : ""
            }`}
          >
            <div className={`text-xs ${day.isToday ? "text-terminal-bright font-bold" : "text-terminal"}`}>
              {day.dayName}
              {day.isToday ? "*" : ""}
            </div>
            <input
              type="number"
              placeholder="kcal"
              value={day.calories ?? ""}
              onChange={(e) => saveNutrition(day.date, "calories", e.target.value)}
              className="!p-2 !text-xs"
            />
            <input
              type="number"
              placeholder="g"
              value={day.protein ?? ""}
              onChange={(e) => saveNutrition(day.date, "protein", e.target.value)}
              className="!p-2 !text-xs"
            />
          </div>
        ))}
      </TerminalCard>

      <TerminalCard title="WEEKLY SUMMARY">
        {[
          {
            label: "Avg Calories",
            value: avgCalories > 0 ? `${avgCalories} kcal` : "-",
            warn: avgCalories > 2000,
          },
          { label: "Target", value: "2000 kcal", dim: true },
          {
            label: "Avg Protein",
            value: avgProtein > 0 ? `${avgProtein}g` : "-",
            warn: avgProtein > 0 && avgProtein < 180,
          },
          { label: "Target", value: "180g", dim: true },
        ].map(({ label, value, warn, dim }) => (
          <div
            key={label + value}
            className="flex justify-between items-center py-2 border-b border-terminal/10"
          >
            <span className="text-terminal-dim text-xs">{label}</span>
            <span
              className={`text-xs ${
                warn ? "text-terminal-warning" : dim ? "text-terminal-dim" : "text-terminal"
              }`}
            >
              {value}
            </span>
          </div>
        ))}
      </TerminalCard>
    </>
  );
}
