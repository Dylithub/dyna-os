"use client";

// Weekly finance tracking — enter daily spending and track against targets.
// $50/day Mon-Fri, $75/day Sat-Sun
// Overspend recalculates allowed spend for remaining days.

import type { LifeOS } from "@/lib/types";
import { getThisWeekFinance, ensureDayLog, getSettings } from "@/lib/storage";
import TerminalCard from "@/components/TerminalCard";

interface FinancesTabProps {
  data: LifeOS;
  update: (updater: (current: LifeOS) => LifeOS) => void;
}

export default function FinancesTab({ data, update }: FinancesTabProps) {
  const settings = getSettings(data);
  const thisWeekFinance = getThisWeekFinance(data);

  // Calculate totals
  const loggedDays = thisWeekFinance.filter((d) => d.amount !== null);
  const totalSpent = loggedDays.reduce((sum, d) => sum + (d.amount || 0), 0);

  // Weekly target: weekday * 5 (Mon-Fri) + weekend * 2 (Sat-Sun)
  const weeklyTarget = settings.weekdaySpendTarget * 5 + settings.weekendSpendTarget * 2;

  // Calculate target spent so far (only for logged days)
  const targetSpentSoFar = loggedDays.reduce((sum, d) => sum + d.target, 0);

  // Calculate remaining budget
  const remainingDays = thisWeekFinance.filter((d) => d.amount === null);
  const originalRemainingTarget = remainingDays.reduce((sum, d) => sum + d.target, 0);

  // Adjusted remaining budget (accounts for overspend)
  const overUnderSoFar = totalSpent - targetSpentSoFar;
  const adjustedRemainingBudget = originalRemainingTarget - overUnderSoFar;

  // Calculate adjusted daily allowance for remaining days
  let adjustedDailyAllowance = 0;
  if (remainingDays.length > 0) {
    adjustedDailyAllowance = Math.max(0, adjustedRemainingBudget / remainingDays.length);
  }

  // Determine status colors
  const isOverBudget = totalSpent > targetSpentSoFar;
  const isWeekOverBudget = totalSpent > weeklyTarget;

  function saveSpend(dateKey: string, value: string) {
    update((current) => {
      const updated = ensureDayLog(current, dateKey);
      if (!updated.dayLogs[dateKey].finance) {
        updated.dayLogs[dateKey].finance = { amount: null };
      }
      updated.dayLogs[dateKey].finance.amount = value ? parseFloat(value) : null;
      return { ...updated };
    });
  }

  return (
    <>
      <div className="text-base text-terminal-bright tracking-widest mb-4 pb-2.5 border-b border-terminal-border">
        FINANCES
      </div>

      <TerminalCard title={`THIS WEEK (${loggedDays.length}/7)`}>
        {/* Column headers */}
        <div className="grid grid-cols-[60px_1fr_60px] gap-2 items-center mb-2">
          <div className="text-terminal-dim text-[10px]">DAY</div>
          <div className="text-terminal-dim text-[10px]">SPENT</div>
          <div className="text-terminal-dim text-[10px]">TARGET</div>
        </div>
        {thisWeekFinance.map((day) => {
          const isOver = day.amount !== null && day.amount > day.target;
          return (
            <div
              key={day.date}
              className={`grid grid-cols-[60px_1fr_60px] gap-2 items-center ${
                day.isToday ? "bg-terminal-card-highlight p-1.5 rounded" : ""
              }`}
            >
              <div className={`text-xs ${day.isToday ? "text-terminal-bright font-bold" : "text-terminal"}`}>
                {day.dayName}
                {day.isToday ? "*" : ""}
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-terminal-dim text-xs pointer-events-none">$</span>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={day.amount ?? ""}
                  onChange={(e) => saveSpend(day.date, e.target.value)}
                  className={`!p-2 !pl-6 !text-xs ${isOver ? "!border-terminal-warning" : ""}`}
                />
              </div>
              <div className={`text-xs text-right ${day.dayOfWeek >= 5 ? "text-terminal-dim" : "text-terminal-dim"}`}>
                ${day.target}
              </div>
            </div>
          );
        })}
      </TerminalCard>

      <TerminalCard title="WEEKLY SUMMARY">
        <div className="flex justify-between items-center py-2 border-b border-terminal/10">
          <span className="text-terminal-dim text-xs">Total Spent</span>
          <span className={`text-xs ${isWeekOverBudget ? "text-terminal-danger" : isOverBudget ? "text-terminal-warning" : "text-terminal"}`}>
            ${totalSpent.toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-terminal/10">
          <span className="text-terminal-dim text-xs">Weekly Target</span>
          <span className="text-terminal-dim text-xs">${weeklyTarget}</span>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-terminal/10">
          <span className="text-terminal-dim text-xs">Target So Far</span>
          <span className="text-terminal-dim text-xs">${targetSpentSoFar}</span>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-terminal/10">
          <span className="text-terminal-dim text-xs">{overUnderSoFar >= 0 ? "Over" : "Under"} Budget</span>
          <span className={`text-xs ${overUnderSoFar > 0 ? "text-terminal-warning" : overUnderSoFar < 0 ? "text-terminal" : "text-terminal-dim"}`}>
            {overUnderSoFar >= 0 ? "+" : "-"}${Math.abs(overUnderSoFar).toFixed(2)}
          </span>
        </div>
      </TerminalCard>

      {remainingDays.length > 0 && (
        <TerminalCard title="REMAINING BUDGET">
          <div className="flex justify-between items-center py-2 border-b border-terminal/10">
            <span className="text-terminal-dim text-xs">Days Left</span>
            <span className="text-terminal text-xs">{remainingDays.length}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-terminal/10">
            <span className="text-terminal-dim text-xs">Original Budget</span>
            <span className="text-terminal-dim text-xs">${originalRemainingTarget}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-terminal/10">
            <span className="text-terminal-dim text-xs">Adjusted Budget</span>
            <span className={`text-xs ${adjustedRemainingBudget < 0 ? "text-terminal-danger" : "text-terminal"}`}>
              ${adjustedRemainingBudget.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-terminal/10">
            <span className="text-terminal-dim text-xs">Per Day Allowance</span>
            <span className={`text-xs font-bold ${adjustedDailyAllowance < 30 ? "text-terminal-warning" : "text-terminal-bright"}`}>
              ${adjustedDailyAllowance.toFixed(2)}
            </span>
          </div>
        </TerminalCard>
      )}

      {loggedDays.length === 7 && (
        <TerminalCard title="WEEK COMPLETE">
          <div className="text-center py-4">
            {totalSpent <= weeklyTarget ? (
              <>
                <div className="text-terminal-bright text-lg mb-2">UNDER BUDGET</div>
                <div className="text-terminal text-sm">
                  Saved ${(weeklyTarget - totalSpent).toFixed(2)} this week
                </div>
              </>
            ) : (
              <>
                <div className="text-terminal-danger text-lg mb-2">OVER BUDGET</div>
                <div className="text-terminal-warning text-sm">
                  Overspent ${(totalSpent - weeklyTarget).toFixed(2)} this week
                </div>
              </>
            )}
          </div>
        </TerminalCard>
      )}
    </>
  );
}
