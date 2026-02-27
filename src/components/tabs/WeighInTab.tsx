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

// Get month and year from ISO week key
function getMonthFromWeekKey(weekKey: string): { month: number; year: number; monthInitial: string } {
  const [year, week] = weekKey.split("-W");
  const weekNum = parseInt(week);

  const jan4 = new Date(parseInt(year), 0, 4);
  const dayOfWeek = jan4.getDay() || 7;
  const firstMonday = new Date(jan4);
  firstMonday.setDate(jan4.getDate() - dayOfWeek + 1);

  const date = new Date(firstMonday);
  date.setDate(firstMonday.getDate() + (weekNum - 1) * 7);

  const monthInitials = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

  return {
    month: date.getMonth(),
    year: date.getFullYear(),
    monthInitial: monthInitials[date.getMonth()],
  };
}

// Simple format for single week (just month initial - used for data point labels)
function formatWeekLabel(weekKey: string): string {
  const { monthInitial } = getMonthFromWeekKey(weekKey);
  return monthInitial;
}

// Generate labels - sequential 1-4 per month, guaranteed no duplicates
function generateWeekLabels(weekKeys: string[]): string[] {
  const monthInitials = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
  const labels: string[] = [];

  // Track current position: which month and which week within that month
  let currentMonth = -1;
  let currentYear = -1;
  let weekInMonth = 0;

  for (let i = 0; i < weekKeys.length; i++) {
    const weekKey = weekKeys[i];
    const [year, week] = weekKey.split("-W");
    const weekNum = parseInt(week);

    // Get Thursday of this ISO week to determine which month it "belongs" to
    const jan4 = new Date(parseInt(year), 0, 4);
    const dayOfWeek = jan4.getDay() || 7;
    const firstMonday = new Date(jan4);
    firstMonday.setDate(jan4.getDate() - dayOfWeek + 1);

    const thursday = new Date(firstMonday);
    thursday.setDate(firstMonday.getDate() + (weekNum - 1) * 7 + 3);

    const thursdayMonth = thursday.getMonth();
    const thursdayYear = thursday.getFullYear();

    // First week: initialize
    if (i === 0) {
      currentMonth = thursdayMonth;
      currentYear = thursdayYear;
      weekInMonth = 1;
    } else {
      // Subsequent weeks: always increment
      weekInMonth++;

      // If we exceed 4 weeks OR the Thursday is in a new month, move to next month
      if (weekInMonth > 4 || thursdayMonth !== currentMonth || thursdayYear !== currentYear) {
        // Move to the next month (based on Thursday's actual month if it changed, else increment)
        if (thursdayMonth !== currentMonth || thursdayYear !== currentYear) {
          currentMonth = thursdayMonth;
          currentYear = thursdayYear;
        } else {
          currentMonth = (currentMonth + 1) % 12;
          if (currentMonth === 0) currentYear++;
        }
        weekInMonth = 1;
      }
    }

    labels.push(`${monthInitials[currentMonth]}${weekInMonth}`);
  }

  return labels;
}

// Get longer format for display (Feb W1)
function formatWeekLabelLong(weekKey: string): string {
  const { month, monthInitial } = getMonthFromWeekKey(weekKey);
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  // For the long format, we just show the month - week number will be contextual
  const [year, week] = weekKey.split("-W");
  const weekNum = parseInt(week);

  const jan4 = new Date(parseInt(year), 0, 4);
  const dayOfWeek = jan4.getDay() || 7;
  const firstMonday = new Date(jan4);
  firstMonday.setDate(jan4.getDate() - dayOfWeek + 1);

  const date = new Date(firstMonday);
  date.setDate(firstMonday.getDate() + (weekNum - 1) * 7);

  const dayOfMonth = date.getDate();
  let weekOfMonth: number;
  if (dayOfMonth <= 7) weekOfMonth = 1;
  else if (dayOfMonth <= 14) weekOfMonth = 2;
  else if (dayOfMonth <= 21) weekOfMonth = 3;
  else weekOfMonth = 4;

  return `${monthNames[month]} W${weekOfMonth}`;
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

    // Generate labels with proper 1-4 cycling per month
    const weekLabels = generateWeekLabels(allWeeks);

    // Fixed viewBox dimensions - scales to fill container
    const width = 320;
    const height = 180;
    const padding = { top: 20, right: 20, bottom: 40, left: 40 };
    const graphWidth = width - padding.left - padding.right;
    const graphHeight = height - padding.top - padding.bottom;

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

    return (
      <div>
        <svg width="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
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
                  className="fill-terminal-dim text-[8px]"
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

          {/* X-axis week labels - EVERY week: F3 F4 M1 M2 M3 M4 A1 A2... */}
          {allWeeks.map((weekKey, i) => {
            const label = weekLabels[i];
            const x = xScale(weekKey);
            const isLast = i === allWeeks.length - 1;

            return (
              <text
                key={weekKey}
                x={x}
                y={height - padding.bottom + 12}
                textAnchor="middle"
                className={`text-[6px] ${isLast && targetWeekKey ? "fill-terminal" : "fill-terminal-dim"}`}
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
            className="fill-terminal-dim text-[8px]"
          >
            {settings.targetWeight}
          </text>
        </svg>
      </div>
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
