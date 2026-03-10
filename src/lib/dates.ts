// Date utility functions.
// These are extracted from the original app's inline JavaScript.

/** Returns today's date as YYYY-MM-DD */
export function getTodayKey(): string {
  const now = new Date();
  return formatDateKey(now);
}

/** Formats a Date object to YYYY-MM-DD */
export function formatDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/**
 * Returns the ISO week key for a given date, e.g. "2025-W03".
 * ISO weeks start on Monday and week 1 is the week containing Jan 4th.
 */
export function getISOWeekKey(date: Date = new Date()): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNum =
    1 +
    Math.round(
      ((d.getTime() - week1.getTime()) / 86400000 -
        3 +
        ((week1.getDay() + 6) % 7)) /
        7
    );
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

/** Returns the Monday of the current week */
export function getMondayOfWeek(date: Date = new Date()): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Simple string hash function (same as original app) */
export function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/** Returns the day of week as 1-7 (1=Monday, 7=Sunday) */
export function getDayOfWeek(date: Date = new Date()): number {
  const day = date.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
  return day === 0 ? 7 : day; // Convert to 1=Monday, 7=Sunday
}
