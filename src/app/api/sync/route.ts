import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { dayLogs, weekLogs, weightEntries, dailySelections } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAuthedUserId } from "@/lib/api-auth";
import { dbToLifeOS, dayLogToRow, weekLogToRow } from "@/lib/sync-transform";
import type { LifeOS } from "@/lib/types";

// GET /api/sync — Pull all user data from the server
export async function GET() {
  const { userId, error } = await getAuthedUserId();
  if (error) return error;

  const [dayLogRows, weekLogRows, weightEntryRows, dailySelectionRows] =
    await Promise.all([
      db.select().from(dayLogs).where(eq(dayLogs.userId, userId)),
      db.select().from(weekLogs).where(eq(weekLogs.userId, userId)),
      db.select().from(weightEntries).where(eq(weightEntries.userId, userId)),
      db
        .select()
        .from(dailySelections)
        .where(eq(dailySelections.userId, userId)),
    ]);

  const lifeOS = dbToLifeOS(
    dayLogRows,
    weekLogRows,
    weightEntryRows,
    dailySelectionRows
  );

  return NextResponse.json(lifeOS);
}

// POST /api/sync — Push full client data to the server (last-write-wins)
export async function POST(req: NextRequest) {
  const { userId, error } = await getAuthedUserId();
  if (error) return error;

  const clientData: LifeOS = await req.json();

  // Upsert all day logs
  const dayLogPromises = Object.entries(clientData.dayLogs).map(
    ([dateKey, dayLog]) => {
      const row = dayLogToRow(dateKey, dayLog);
      return db
        .insert(dayLogs)
        .values({ userId, ...row })
        .onConflictDoUpdate({
          target: [dayLogs.userId, dayLogs.dateKey],
          set: row,
        });
    }
  );

  // Upsert all week logs
  const weekLogPromises = Object.entries(clientData.weekLogs).map(
    ([weekKey, weekLog]) => {
      const row = weekLogToRow(weekKey, weekLog);
      return db
        .insert(weekLogs)
        .values({ userId, ...row })
        .onConflictDoUpdate({
          target: [weekLogs.userId, weekLogs.weekKey],
          set: row,
        });
    }
  );

  // Replace all weight entries (delete + insert for simplicity)
  const weightPromise = (async () => {
    await db
      .delete(weightEntries)
      .where(eq(weightEntries.userId, userId));
    if (clientData.weightEntries.length > 0) {
      await db.insert(weightEntries).values(
        clientData.weightEntries.map((entry) => ({
          userId,
          weightLb: entry.weightLb,
          date: entry.date,
        }))
      );
    }
  })();

  // Upsert all daily selections
  const selectionPromises = Object.entries(clientData.dailySelections).map(
    ([dateKey, sel]) =>
      db
        .insert(dailySelections)
        .values({ userId, dateKey, philosophyLine: sel.philosophyLine ?? null })
        .onConflictDoUpdate({
          target: [dailySelections.userId, dailySelections.dateKey],
          set: { philosophyLine: sel.philosophyLine ?? null },
        })
  );

  await Promise.all([
    ...dayLogPromises,
    ...weekLogPromises,
    weightPromise,
    ...selectionPromises,
  ]);

  return NextResponse.json({ ok: true });
}
