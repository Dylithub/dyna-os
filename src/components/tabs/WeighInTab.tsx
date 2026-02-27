"use client";

import { useState } from "react";
import type { LifeOS } from "@/lib/types";
import { getTodayKey } from "@/lib/dates";
import { getSettings } from "@/lib/storage";
import TerminalCard from "@/components/TerminalCard";
import TerminalButton from "@/components/TerminalButton";

interface WeighInTabProps {
  data: LifeOS;
  update: (updater: (current: LifeOS) => LifeOS) => void;
}

interface MonthlyDataPoint {
  monthKey: string; // YYYY-MM
  monthLabel: string; // "Feb", "Mar", etc.
  weightLb: number; // lowest weight that month
}

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

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

  // Group by month and get LOWEST weight per month
  const monthlyWeights: Record<string, number> = {};
  data.weightEntries.forEach((entry) => {
    const monthKey = entry.date.substring(0, 7); // YYYY-MM
    if (!monthlyWeights[monthKey] || entry.weightLb < monthlyWeights[monthKey]) {
      monthlyWeights[monthKey] = entry.weightLb;
    }
  });

  // Convert to array and sort chronologically
  const monthlyData: MonthlyDataPoint[] = Object.entries(monthlyWeights)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([monthKey, weightLb]) => {
      const month = parseInt(monthKey.split("-")[1]) - 1;
      return {
        monthKey,
        monthLabel: MONTH_LABELS[month],
        weightLb,
      };
    });

  // Target month
  const targetDate = settings.targetWeightDate ? new Date(settings.targetWeightDate) : null;
  const targetMonthKey = targetDate
    ? `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, "0")}`
    : null;
  const targetMonthLabel = targetDate ? MONTH_LABELS[targetDate.getMonth()] : null;

  // Calculate insights
  let avgLossPerMonth = 0;
  let monthsToGoal = 0;
  let onTrack = false;

  if (monthlyData.length >= 2) {
    const firstWeight = monthlyData[0].weightLb;
    const lastWeight = monthlyData[monthlyData.length - 1].weightLb;
    const totalChange = firstWeight - lastWeight;
    avgLossPerMonth = totalChange / (monthlyData.length - 1);

    if (avgLossPerMonth > 0 && toGo !== null && toGo > 0) {
      monthsToGoal = Math.ceil(toGo / avgLossPerMonth);
    }

    if (targetDate && latestWeight !== null) {
      const now = new Date();
      const monthsRemaining = Math.ceil((targetDate.getTime() - now.getTime()) / (30 * 24 * 60 * 60 * 1000));
      const requiredLossPerMonth = toGo !== null && monthsRemaining > 0 ? toGo / monthsRemaining : 0;
      onTrack = avgLossPerMonth >= requiredLossPerMonth;
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

  // SVG Line Graph - monthly view
  function renderGraph() {
    if (monthlyData.length < 1) {
      return <div className="text-terminal-dim text-center py-8">No weight data yet.</div>;
    }

    // Generate all months from first data to target
    const firstMonthKey = monthlyData[0].monthKey;
    const lastDataMonthKey = monthlyData[monthlyData.length - 1].monthKey;
    const endMonthKey = targetMonthKey && targetMonthKey > lastDataMonthKey
      ? targetMonthKey
      : lastDataMonthKey;

    // Generate month range
    const allMonths: { monthKey: string; label: string }[] = [];
    const [startYear, startMonth] = firstMonthKey.split("-").map(Number);
    const [endYear, endMonth] = endMonthKey.split("-").map(Number);

    let year = startYear;
    let month = startMonth;
    while (year < endYear || (year === endYear && month <= endMonth)) {
      const key = `${year}-${String(month).padStart(2, "0")}`;
      allMonths.push({ monthKey: key, label: MONTH_LABELS[month - 1] });
      month++;
      if (month > 12) {
        month = 1;
        year++;
      }
    }

    // Graph dimensions
    const width = 320;
    const height = 180;
    const padding = { top: 20, right: 20, bottom: 35, left: 40 };
    const graphWidth = width - padding.left - padding.right;
    const graphHeight = height - padding.top - padding.bottom;

    // Weight range
    const weights = monthlyData.map(d => d.weightLb);
    const minWeight = Math.min(...weights, settings.targetWeight) - 3;
    const maxWeight = Math.max(...weights) + 3;
    const weightRange = maxWeight - minWeight;

    // Scale functions
    const xScale = (monthKey: string) => {
      const index = allMonths.findIndex(m => m.monthKey === monthKey);
      const progress = allMonths.length > 1 ? index / (allMonths.length - 1) : 0.5;
      return padding.left + progress * graphWidth;
    };
    const yScale = (weight: number) => padding.top + ((maxWeight - weight) / weightRange) * graphHeight;

    // Create path for the line
    const linePath = monthlyData
      .map((d, i) => `${i === 0 ? "M" : "L"} ${xScale(d.monthKey)} ${yScale(d.weightLb)}`)
      .join(" ");

    // Target line Y position
    const targetY = yScale(settings.targetWeight);

    // Target point X position
    const targetX = targetMonthKey ? xScale(targetMonthKey) : width - padding.right;

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
          {monthlyData.length >= 1 && targetMonthKey && targetMonthKey > lastDataMonthKey && (
            <line
              x1={xScale(lastDataMonthKey)}
              y1={yScale(monthlyData[monthlyData.length - 1].weightLb)}
              x2={targetX}
              y2={targetY}
              stroke="#20c20e"
              strokeWidth="1"
              strokeDasharray="2,4"
              opacity="0.3"
            />
          )}

          {/* Data line */}
          {monthlyData.length > 1 && (
            <path
              d={linePath}
              fill="none"
              stroke="#20c20e"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Data points */}
          {monthlyData.map((d) => (
            <circle
              key={d.monthKey}
              cx={xScale(d.monthKey)}
              cy={yScale(d.weightLb)}
              r="3"
              fill="#0a0a0a"
              stroke="#20c20e"
              strokeWidth="1.5"
            />
          ))}

          {/* Target point */}
          {targetMonthKey && (
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

          {/* X-axis month labels */}
          {allMonths.map((m, i) => (
            <text
              key={m.monthKey}
              x={xScale(m.monthKey)}
              y={height - padding.bottom + 14}
              textAnchor="middle"
              className={`text-[8px] ${m.monthKey === targetMonthKey ? "fill-terminal" : "fill-terminal-dim"}`}
            >
              {m.label}
            </text>
          ))}

          {/* Goal label */}
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
        {targetMonthLabel && (
          <div className="flex justify-between items-center py-2 border-b border-terminal/10">
            <span className="text-terminal-dim text-xs">Target Date</span>
            <span className="text-terminal-dim text-xs">{targetMonthLabel} {targetDate?.getFullYear()}</span>
          </div>
        )}
      </TerminalCard>

      <TerminalCard title="TREND">
        {renderGraph()}
      </TerminalCard>

      <TerminalCard title="INSIGHTS">
        {monthlyData.length >= 2 ? (
          <>
            <div className="flex justify-between items-center py-2 border-b border-terminal/10">
              <span className="text-terminal-dim text-xs">Avg/Month</span>
              <span className={`text-xs ${avgLossPerMonth > 0 ? "text-terminal" : avgLossPerMonth < 0 ? "text-terminal-warning" : "text-terminal-dim"}`}>
                {avgLossPerMonth > 0 ? "-" : "+"}{Math.abs(avgLossPerMonth).toFixed(1)} lbs
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-terminal/10">
              <span className="text-terminal-dim text-xs">Months Tracked</span>
              <span className="text-terminal text-xs">{monthlyData.length}</span>
            </div>
            {toGo !== null && toGo > 0 && avgLossPerMonth > 0 && (
              <div className="flex justify-between items-center py-2 border-b border-terminal/10">
                <span className="text-terminal-dim text-xs">Est. Months to Goal</span>
                <span className="text-terminal text-xs">{monthsToGoal}</span>
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
          <div className="text-terminal-dim text-xs">Need 2+ months for insights.</div>
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
