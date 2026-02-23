"use client";

// The Today dashboard - shows a daily overview.
// This is the equivalent of renderToday() from the original app.

import type { LifeOS } from "@/lib/types";
import { getTodayKey, getISOWeekKey, getMondayOfWeek, formatDateKey } from "@/lib/dates";
import { pickDailyPhilosophyLine, getThisWeekNutrition } from "@/lib/storage";
import TerminalCard from "@/components/TerminalCard";

interface TodayTabProps {
  data: LifeOS;
}

export default function TodayTab({ data }: TodayTabProps) {
  const todayKey = getTodayKey();
  const weekKey = getISOWeekKey();
  const dayLog = data.dayLogs[todayKey];
  const weekLog = data.weekLogs[weekKey];
  const philosophyLine = pickDailyPhilosophyLine(data, todayKey);

  // Calculate exercise progress
  const ec = weekLog?.exerciseContract;
  const zone2Done = ec?.zone2Done || 0;
  const strengthDone =
    (ec?.strength?.armsChest ? 1 : 0) +
    (ec?.strength?.legs ? 1 : 0) +
    (ec?.strength?.coreBack ? 1 : 0);
  const totalSessions = zone2Done + strengthDone;

  // Check action items
  const checkInDone = dayLog?.checkIn?.mood !== null;
  const nutritionDone = dayLog?.nutrition?.calories !== null;

  // Weekly nutrition averages
  const thisWeekNutrition = getThisWeekNutrition(data);
  const nutritionLoggedDays = thisWeekNutrition.filter((d) => d.calories !== null);
  const avgCalories =
    nutritionLoggedDays.length > 0
      ? Math.round(
          nutritionLoggedDays.reduce((sum, d) => sum + (d.calories || 0), 0) /
            nutritionLoggedDays.length
        )
      : 0;
  const avgProtein =
    nutritionLoggedDays.length > 0
      ? Math.round(
          nutritionLoggedDays.reduce((sum, d) => sum + (d.protein || 0), 0) /
            nutritionLoggedDays.length
        )
      : 0;

  // Weekly check-in averages
  const monday = getMondayOfWeek();
  let moodSum = 0,
    energySum = 0,
    stressSum = 0,
    checkInCount = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dateKey = formatDateKey(d);
    const ci = data.dayLogs[dateKey]?.checkIn;
    if (ci && ci.mood !== null) {
      moodSum += ci.mood;
      energySum += ci.energy || 0;
      stressSum += ci.stress || 0;
      checkInCount++;
    }
  }
  const avgMood = checkInCount > 0 ? (moodSum / checkInCount).toFixed(1) : "-";
  const avgEnergy = checkInCount > 0 ? (energySum / checkInCount).toFixed(1) : "-";
  const avgStress = checkInCount > 0 ? (stressSum / checkInCount).toFixed(1) : "-";

  // Check weigh-in for this week
  const weekStart = getMondayOfWeek();
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const weekStartKey = formatDateKey(weekStart);
  const weekEndKey = formatDateKey(weekEnd);
  const weighInDone = data.weightEntries.some(
    (e) => e.date >= weekStartKey && e.date <= weekEndKey
  );

  const todayDate = new Date();

  return (
    <>
      {/* Section title */}
      <div className="text-base text-terminal-bright tracking-widest mb-4 pb-2.5 border-b border-terminal-border">
        TODAY -{" "}
        {todayDate.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        })}
      </div>

      {/* Daily wisdom quote */}
      <TerminalCard highlight>
        <div className="text-terminal-bright italic text-xs leading-relaxed">
          &ldquo;{philosophyLine}&rdquo;
        </div>
      </TerminalCard>

      {/* Weekly contract progress */}
      <TerminalCard title="WEEKLY CONTRACT">
        <div className="flex justify-between items-center py-2 border-b border-terminal/10">
          <span className="text-terminal-dim text-xs">SESSIONS</span>
          <span className={`text-xs ${totalSessions >= 7 ? "text-terminal-bright" : "text-terminal"}`}>
            {totalSessions} / 7
          </span>
        </div>
        <div className="flex gap-2 mt-2 flex-wrap">
          {Array(7)
            .fill(0)
            .map((_, i) => (
              <div
                key={i}
                className={`w-6 h-6 border border-terminal-border ${
                  i < totalSessions ? "bg-terminal" : "bg-transparent"
                }`}
              />
            ))}
        </div>
      </TerminalCard>

      {/* Weekly nutrition summary */}
      <TerminalCard title={`WEEKLY NUTRITION (${nutritionLoggedDays.length}/7)`}>
        <div className="flex justify-between items-center py-2 border-b border-terminal/10">
          <span className="text-terminal-dim text-xs">Avg Calories</span>
          <span className={`text-xs ${avgCalories > 2000 ? "text-terminal-warning" : "text-terminal"}`}>
            {avgCalories > 0 ? `${avgCalories} kcal` : "-"}
          </span>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-terminal/10">
          <span className="text-terminal-dim text-xs">Avg Protein</span>
          <span
            className={`text-xs ${avgProtein > 0 && avgProtein < 180 ? "text-terminal-warning" : "text-terminal"}`}
          >
            {avgProtein > 0 ? `${avgProtein}g` : "-"}
          </span>
        </div>
      </TerminalCard>

      {/* Weekly check-in averages */}
      <TerminalCard title={`WEEKLY CHECK-IN (${checkInCount}/7)`}>
        {[
          { label: "Mood", value: avgMood },
          { label: "Energy", value: avgEnergy },
          { label: "Calm", value: avgStress },
        ].map(({ label, value }) => (
          <div key={label} className="flex justify-between items-center py-2 border-b border-terminal/10">
            <span className="text-terminal-dim text-xs">{label}</span>
            <span className="text-terminal text-xs">{value}/5</span>
          </div>
        ))}
      </TerminalCard>

      {/* Action items */}
      <TerminalCard title="ACTION ITEMS">
        <ul className="list-none p-0 m-0">
          {[
            { done: checkInDone, label: "Daily check-in" },
            { done: nutritionDone, label: "Log calories" },
            { done: weighInDone, label: "Weekly weigh-in" },
          ].map(({ done, label }) => (
            <li
              key={label}
              className="py-2 text-terminal text-xs border-b border-terminal/10 last:border-b-0 flex items-center gap-2"
            >
              <span
                className={`inline-block px-2 py-0.5 text-[10px] tracking-wider rounded-sm ${
                  done
                    ? "bg-terminal/20 text-terminal-bright"
                    : "bg-terminal-warning/20 text-terminal-warning"
                }`}
              >
                {done ? "DONE" : "DUE"}
              </span>
              {label}
            </li>
          ))}
        </ul>
      </TerminalCard>
    </>
  );
}
