"use client";

// Weekly nutrition grid — enter calories and protein for each day.
//
// This component shows the "controlled input" pattern in React:
// The input values are driven by the data (not the other way around).
// When you type, the onChange handler updates the data, which causes
// React to re-render with the new value in the input. This keeps
// the UI and data always in sync.

import { useState } from "react";
import { useSession } from "next-auth/react";
import type { LifeOS, NutritionEstimate } from "@/lib/types";
import { getTodayKey } from "@/lib/dates";
import { getThisWeekNutrition, ensureDayLog, getSettings } from "@/lib/storage";
import { useOnlineStatus } from "@/lib/useOnlineStatus";
import TerminalCard from "@/components/TerminalCard";
import TerminalButton from "@/components/TerminalButton";

interface CaloriesTabProps {
  data: LifeOS;
  update: (updater: (current: LifeOS) => LifeOS) => void;
}

export default function CaloriesTab({ data, update }: CaloriesTabProps) {
  const { data: session } = useSession();
  const isOnline = useOnlineStatus();
  const [description, setDescription] = useState("");
  const [estimating, setEstimating] = useState(false);
  const [estimate, setEstimate] = useState<NutritionEstimate | null>(null);
  const [estimateError, setEstimateError] = useState<string | null>(null);

  const estimatorAvailable = Boolean(session?.user) && isOnline;

  async function handleEstimate() {
    if (!description.trim() || estimating) return;
    setEstimating(true);
    setEstimateError(null);
    setEstimate(null);
    try {
      // Direct fetch (not apiFetch) so the route's error message reaches the UI
      const res = await fetch("/api/estimate-nutrition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: description.trim() }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setEstimateError(body?.error || `Estimation failed (${res.status})`);
        return;
      }
      setEstimate(body as NutritionEstimate);
    } catch {
      setEstimateError("Network error — check your connection");
    } finally {
      setEstimating(false);
    }
  }

  function handleAddToToday() {
    if (!estimate) return;
    update((current) => {
      const todayKey = getTodayKey();
      const updated = ensureDayLog(current, todayKey);
      const n = updated.dayLogs[todayKey].nutrition;
      n.calories = (n.calories ?? 0) + estimate.calories;
      n.protein = (n.protein ?? 0) + estimate.protein;
      return { ...updated };
    });
    setEstimate(null);
    setDescription("");
  }
  const settings = getSettings(data);
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

      <TerminalCard title="AI ESTIMATE">
        <div className="text-terminal-dim text-[10px] mb-2">
          DESCRIBE A MEAL — GET KCAL + PROTEIN
        </div>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. 200g chicken breast, rice, broccoli"
          disabled={!estimatorAvailable || estimating}
          className="!min-h-[70px] !text-xs mb-2"
        />
        {!estimatorAvailable && (
          <div className="text-terminal-dim text-[10px] mb-2">
            {!isOnline
              ? "OFFLINE — estimator needs a connection. Manual entry above still works."
              : "SIGN IN TO USE THE ESTIMATOR — manual entry above still works."}
          </div>
        )}
        {estimateError && (
          <div className="text-terminal-warning text-[10px] mb-2">{estimateError}</div>
        )}
        {!estimate && (
          <TerminalButton
            onClick={handleEstimate}
            small
            className={!estimatorAvailable || estimating || !description.trim() ? "opacity-50" : ""}
          >
            {estimating ? "ESTIMATING..." : "ESTIMATE"}
          </TerminalButton>
        )}
        {estimate && (
          <>
            <div className="mt-1 mb-2">
              {estimate.items.map((item, i) => (
                <div
                  key={i}
                  className="flex justify-between items-center py-1 border-b border-terminal/10"
                >
                  <span className="text-terminal-dim text-xs">{item.name}</span>
                  <span className="text-terminal text-xs">
                    {item.calories} kcal / {item.protein}g
                  </span>
                </div>
              ))}
              <div className="flex justify-between items-center py-1.5">
                <span className="text-terminal-bright text-xs font-bold">TOTAL</span>
                <span className="text-terminal-bright text-xs font-bold">
                  {estimate.calories} kcal / {estimate.protein}g
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <TerminalButton onClick={handleAddToToday} small>
                ADD TO TODAY
              </TerminalButton>
              <TerminalButton onClick={() => setEstimate(null)} small>
                DISCARD
              </TerminalButton>
            </div>
          </>
        )}
      </TerminalCard>

      <TerminalCard title="WEEKLY SUMMARY">
        {[
          {
            label: "Avg Calories",
            value: avgCalories > 0 ? `${avgCalories} kcal` : "-",
            warn: avgCalories > settings.calorieTarget,
          },
          { label: "Target", value: `${settings.calorieTarget} kcal`, dim: true },
          {
            label: "Avg Protein",
            value: avgProtein > 0 ? `${avgProtein}g` : "-",
            warn: avgProtein > 0 && avgProtein < settings.proteinTarget,
          },
          { label: "Target", value: `${settings.proteinTarget}g`, dim: true },
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
