import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { dayLogs } from "@/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { getAuthedUserId } from "@/lib/api-auth";
import { getMondayOfWeek, formatDateKey } from "@/lib/dates";

export async function GET(req: NextRequest) {
  const { userId, error } = await getAuthedUserId();
  if (error) return error;

  const dateKey = req.nextUrl.searchParams.get("dateKey");
  const weekOf = req.nextUrl.searchParams.get("weekOf");

  if (dateKey) {
    const rows = await db
      .select()
      .from(dayLogs)
      .where(and(eq(dayLogs.userId, userId), eq(dayLogs.dateKey, dateKey)));
    return NextResponse.json(rows[0] ?? null);
  }

  if (weekOf) {
    const monday = getMondayOfWeek(new Date(weekOf));
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);

    const rows = await db
      .select()
      .from(dayLogs)
      .where(
        and(
          eq(dayLogs.userId, userId),
          gte(dayLogs.dateKey, formatDateKey(monday)),
          lte(dayLogs.dateKey, formatDateKey(sunday))
        )
      );
    return NextResponse.json(rows);
  }

  return NextResponse.json({ error: "Provide dateKey or weekOf" }, { status: 400 });
}

export async function PUT(req: NextRequest) {
  const { userId, error } = await getAuthedUserId();
  if (error) return error;

  const body = await req.json();
  const { dateKey, ...fields } = body;

  if (!dateKey) {
    return NextResponse.json({ error: "dateKey required" }, { status: 400 });
  }

  await db
    .insert(dayLogs)
    .values({ userId, dateKey, ...fields, updatedAt: new Date().toISOString() })
    .onConflictDoUpdate({
      target: [dayLogs.userId, dayLogs.dateKey],
      set: { ...fields, updatedAt: new Date().toISOString() },
    });

  return NextResponse.json({ ok: true });
}
