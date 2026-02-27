"use client";

// Weigh-in tracking — log weight entries and see trends.

import { useState } from "react";
import type { LifeOS } from "@/lib/types";
import { getTodayKey, getISOWeekKey } from "@/lib/dates";
import { getSettings } from "@/lib/storage";
import TerminalCard from "@/components/TerminalCard";
import TerminalButton from "@/components/TerminalButton";

interface WeighInTabProps {
  data: LifeOS;
  update: (updater: (current: LifeOS) => LifeOS) => void;
}

interface WeeklyDataPoint {
  weekKey: string;
  weightLb: number;
  weekLabel: string;
}

// Format week key (2024-W05) to short label (F1, F2, M1, etc.)
// Each month has exactly 4 weeks (1-4), letter is first letter of month
function formatWeekLabel(weekKey: string): string {
  const [year, week] = weekKey.split("-W");
  const weekNum = parseInt(week);

  // Calculate date from ISO week number
  const date = new Date(parseInt(year), 0, 4); // Jan 4 is always in week 1
  date.setDate(date.getDate() + (weekNum - 1) * 7);

  // Get month initial (J, F, M, A, M, J, J, A, S, O, N, D)
  const monthInitials = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
  const monthInitial = monthInitials[date.getMonth()];

  // Week of month: 1-4 based on which quarter of the month we're in
  const dayOfMonth = date.getDate();
  const weekOfMonth = Math.min(4, Math.ceil(dayOfMonth / 7));

  return `${monthInitial}${weekOfMonth}`;
}

// Get longer format for display (Feb W1)
function formatWeekLabelLong(weekKey: string): string {
  const [year, week] = weekKey.split("-W");
  const weekNum = parseInt(week);

  const date = new Date(parseInt(year), 0, 4);
  date.setDate(date.getDate() + (weekNum - 1) * 7);

  const month = date.toLocaleDateString("en-US", { month: "short" });
  const dayOfMonth = date.getDate();
  const weekOfMonth = Math.min(4, Math.ceil(dayOfMonth / 7));

  return `${month} W${weekOfMonth}`;
}

// Get week key for a date
function getWeekKeyForDate(date: Date): string {
  return getISOWeekKey(date);
}

export default function WeighInTab({ data, update }: WeighInTabProps) {
  const settings = getSettings(data);
  const [weightInput, setWeightInput] = useState("");
  const [dateInput, setDateInput] = useState(getTodayKey());

  const allEntries = [...data.weightEntries].sort((a, b) =>
    b.date.localeCompare(a.date)
  );

  // Get latest weight for progress display
  const latestWeight = allEntries.length > 0 ? allEntries[0].weightLb : null;
  const toGo = latestWeight !== null ? latestWeight - settings.targetWeight : null;

  // Calculate weekly data - most recent entry per week
  const weeklyWeights: Record<string, { weekKey: string; weightLb: number; date: string }> = {};
  data.weightEntries.forEach((entry) => {
    const weekKey = getISOWeekKey(new Date(entry.date));
    // Use most recent entry for each week (not lowest)
    if (!weeklyWeights[weekKey] || entry.date > weeklyWeights[weekKey].date) {
      weeklyWeights[weekKey] = { weekKey, weightLb: entry.weightLb, date: entry.date };
    }
  });

  // Sort chronologically and limit to last 12 weeks
  const weeklyData: WeeklyDataPoint[] = Object.values(weeklyWeights)
    .sort((a, b) => a.weekKey.localeCompare(b.weekKey))
    .slice(-12)
    .map(w => ({
      weekKey: w.weekKey,
      weightLb: w.weightLb,
      weekLabel: formatWeekLabel(w.weekKey),
    }));

  // Calculate target week
  const targetDate = settings.targetWeightDate ? new Date(settings.targetWeightDate) : null;
  const targetWeekKey = targetDate ? getWeekKeyForDate(targetDate) : null;
  const targetWeekLabel = targetWeekKey ? formatWeekLabel(targetWeekKey) : null;
  const targetWeekLabelLong = targetWeekKey ? formatWeekLabelLong(targetWeekKey) : null;

  // Calculate insights
  let avgLossPerWeek = 0;
  let weeksToGoal = 0;
  let onTrack = false;

  if (weeklyData.length >= 2) {
    const firstWeight = weeklyData[0].weightLb;
    const lastWeight = weeklyData[weeklyData.length - 1].weightLb;
    const totalChange = firstWeight - lastWeight; // positive = lost weight
    avgLossPerWeek = totalChange / (weeklyData.length - 1);

    if (avgLossPerWeek > 0 && toGo !== null && toGo > 0) {
      weeksToGoal = Math.ceil(toGo / avgLossPerWeek);
    }

    // Check if on track to hit target by target date
    if (targetDate && latestWeight !== null) {
      const now = new Date();
      const weeksRemaining = Math.ceil((targetDate.getTime() - now.getTime()) / (7 * 24 * 60 * 60 * 1000));
      const requiredLossPerWeek = toGo !== null && weeksRemaining > 0 ? toGo / weeksRemaining : 0;
      onTrack = avgLossPerWeek >= requiredLossPerWeek;
    }
  }

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

  // SVG Line Graph - spans from first entry to target date
  function renderGraph() {
    if (weeklyData.length < 1) {
      return <div className="text-terminal-dim text-center py-8">No weight data yet.</div>;
    }

    const width = 320;
    const height = 200;
    const padding = { top: 20, right: 25, bottom: 50, left: 35 };
    const graphWidth = width - padding.left - padding.right;
    const graphHeight = height - padding.top - padding.bottom;

    // Determine the time range: first entry to target date
    const firstWeekKey = weeklyData[0].weekKey;
    const lastDataWeekKey = weeklyData[weeklyData.length - 1].weekKey;

    // Use target date as the end point, or last data point if no target
    const endWeekKey = targetWeekKey && targetWeekKey > lastDataWeekKey
      ? targetWeekKey
      : lastDataWeekKey;

    // Calculate week numbers for scaling
    const weekToNumber = (weekKey: string): number => {
      const [year, week] = weekKey.split("-W").map(Number);
      return year * 52 + week;
    };

    // Generate week key from number
    const numberToWeekKey = (num: number): string => {
      const year = Math.floor(num / 52);
      const week = num % 52 || 52;
      return `${year}-W${String(week).padStart(2, "0")}`;
    };

    const startWeekNum = weekToNumber(firstWeekKey);
    const endWeekNum = weekToNumber(endWeekKey);
    const totalWeeks = Math.max(endWeekNum - startWeekNum, 1);

    // Generate all weeks for X-axis
    const allWeeks: string[] = [];
    for (let i = startWeekNum; i <= endWeekNum; i++) {
      allWeeks.push(numberToWeekKey(i));
    }

    // Calculate weight range
    const weights = weeklyData.map(d => d.weightLb);
    const minWeight = Math.min(...weights, settings.targetWeight) - 3;
    const maxWeight = Math.max(...weights) + 3;
    const weightRange = maxWeight - minWeight;

    // Scale functions
    const xScale = (weekKey: string) => {
      const weekNum = weekToNumber(weekKey);
      const progress = (weekNum - startWeekNum) / totalWeeks;
      return padding.left + progress * graphWidth;
    };
    const yScale = (weight: number) => padding.top + ((maxWeight - weight) / weightRange) * graphHeight;

    // Create path for the line
    const linePath = weeklyData
      .map((d, i) => `${i === 0 ? "M" : "L"} ${xScale(d.weekKey)} ${yScale(d.weightLb)}`)
      .join(" ");

    // Target line Y position
    const targetY = yScale(settings.targetWeight);

    // Target point position (where goal line meets target date)
    const targetX = targetWeekKey ? xScale(targetWeekKey) : width - padding.right;

    // Determine which weeks to show labels for (avoid overcrowding)
    const maxLabels = 16;
    const skipInterval = Math.ceil(allWeeks.length / maxLabels);

    return (
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
          const y = padding.top + pct * graphHeight;
          const weight = maxWeight - pct * weightRange;
          return (
            <g key={pct}>
              <line
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke="rgba(32, 194, 14, 0.08)"
                strokeDasharray="2,2"
              />
              <text
                x={padding.left - 4}
                y={y}
                textAnchor="end"
                dominantBaseline="middle"
                className="fill-terminal-dim text-[7px]"
              >
                {Math.round(weight)}
              </text>
            </g>
          );
        })}

        {/* Target weight line (dashed) */}
        <line
          x1={padding.left}
          y1={targetY}
          x2={width - padding.right}
          y2={targetY}
          stroke="#20c20e"
          strokeWidth="1"
          strokeDasharray="3,3"
          opacity="0.4"
        />

        {/* Projected line from last data point to target */}
        {weeklyData.length >= 1 && targetWeekKey && targetWeekKey > lastDataWeekKey && (
          <line
            x1={xScale(lastDataWeekKey)}
            y1={yScale(weeklyData[weeklyData.length - 1].weightLb)}
            x2={targetX}
            y2={targetY}
            stroke="#20c20e"
            strokeWidth="1"
            strokeDasharray="2,4"
            opacity="0.3"
          />
        )}

        {/* Data line */}
        <path
          d={linePath}
          fill="none"
          stroke="#20c20e"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points */}
        {weeklyData.map((d) => (
          <circle
            key={d.weekKey}
            cx={xScale(d.weekKey)}
            cy={yScale(d.weightLb)}
            r="3"
            fill="#0a0a0a"
            stroke="#20c20e"
            strokeWidth="1.5"
          />
        ))}

        {/* Target point */}
        {targetWeekKey && (
          <circle
            cx={targetX}
            cy={targetY}
            r="3"
            fill="none"
            stroke="#20c20e"
            strokeWidth="1"
            strokeDasharray="2,2"
            opacity="0.6"
          />
        )}

        {/* X-axis week labels (F1, F2, M1, M2, etc.) */}
        {allWeeks.map((weekKey, i) => {
          // Show first, last, and evenly spaced labels
          const isFirst = i === 0;
          const isLast = i === allWeeks.length - 1;
          const isInterval = i % skipInterval === 0;

          if (!isFirst && !isLast && !isInterval) return null;

          const label = formatWeekLabel(weekKey);
          const x = xScale(weekKey);

          return (
            <text
              key={weekKey}
              x={x}
              y={height - padding.bottom + 12}
              textAnchor="middle"
              className={`text-[7px] ${isLast && targetWeekKey ? "fill-terminal" : "fill-terminal-dim"}`}
            >
              {label}
            </text>
          );
        })}

        {/* Goal label on right */}
        <text
          x={width - padding.right + 3}
          y={targetY}
          textAnchor="start"
          dominantBaseline="middle"
          className="fill-terminal-dim text-[7px]"
        >
          {settings.targetWeight}
        </text>
      </svg>
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

      <TerminalCard title="PROGRESS">
        <div className="flex justify-between items-center py-2 border-b border-terminal/10">
          <span className="text-terminal-dim text-xs">Current</span>
          <span className="text-terminal text-xs">
            {latestWeight !== null ? `${latestWeight} lbs` : "-"}
          </span>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-terminal/10">
          <span className="text-terminal-dim text-xs">Target</span>
          <span className="text-terminal-dim text-xs">{settings.targetWeight} lbs</span>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-terminal/10">
          <span className="text-terminal-dim text-xs">To Go</span>
          <span className={`text-xs ${toGo !== null && toGo <= 0 ? "text-terminal-bright" : "text-terminal-warning"}`}>
            {toGo !== null ? (toGo <= 0 ? "Goal reached!" : `${toGo.toFixed(1)} lbs`) : "-"}
          </span>
        </div>
        {targetWeekLabelLong && (
          <div className="flex justify-between items-center py-2 border-b border-terminal/10">
            <span className="text-terminal-dim text-xs">Target Date</span>
            <span className="text-terminal-dim text-xs">{targetWeekLabelLong}</span>
          </div>
        )}
      </TerminalCard>

      <TerminalCard title="TREND">
        {renderGraph()}
      </TerminalCard>

      <TerminalCard title="INSIGHTS">
        {weeklyData.length >= 2 ? (
          <>
            <div className="flex justify-between items-center py-2 border-b border-terminal/10">
              <span className="text-terminal-dim text-xs">Avg/Week</span>
              <span className={`text-xs ${avgLossPerWeek > 0 ? "text-terminal" : avgLossPerWeek < 0 ? "text-terminal-warning" : "text-terminal-dim"}`}>
                {avgLossPerWeek > 0 ? "-" : "+"}{Math.abs(avgLossPerWeek).toFixed(2)} lbs
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-terminal/10">
              <span className="text-terminal-dim text-xs">Weeks Tracked</span>
              <span className="text-terminal text-xs">{weeklyData.length}</span>
            </div>
            {toGo !== null && toGo > 0 && avgLossPerWeek > 0 && (
              <div className="flex justify-between items-center py-2 border-b border-terminal/10">
                <span className="text-terminal-dim text-xs">Est. Weeks to Goal</span>
                <span className="text-terminal text-xs">{weeksToGoal}</span>
              </div>
            )}
            {targetDate && (
              <div className="flex justify-between items-center py-2 border-b border-terminal/10">
                <span className="text-terminal-dim text-xs">On Track</span>
                <span className={`text-xs ${onTrack ? "text-terminal-bright" : "text-terminal-warning"}`}>
                  {onTrack ? "Yes" : "Behind pace"}
                </span>
              </div>
            )}
          </>
        ) : (
          <div className="text-terminal-dim text-xs">Need 2+ weeks for insights.</div>
        )}
      </TerminalCard>

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
