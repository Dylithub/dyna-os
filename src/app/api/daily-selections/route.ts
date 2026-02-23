import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { dailySelections } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getAuthedUserId } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  const { userId, error } = await getAuthedUserId();
  if (error) return error;

  const dateKey = req.nextUrl.searchParams.get("dateKey");
  if (!dateKey) {
    return NextResponse.json({ error: "dateKey required" }, { status: 400 });
  }

  const rows = await db
    .select()
    .from(dailySelections)
    .where(
      and(eq(dailySelections.userId, userId), eq(dailySelections.dateKey, dateKey))
    );

  return NextResponse.json(rows[0] ?? null);
}

export async function PUT(req: NextRequest) {
  const { userId, error } = await getAuthedUserId();
  if (error) return error;

  const { dateKey, philosophyLine } = await req.json();

  if (!dateKey) {
    return NextResponse.json({ error: "dateKey required" }, { status: 400 });
  }

  await db
    .insert(dailySelections)
    .values({ userId, dateKey, philosophyLine })
    .onConflictDoUpdate({
      target: [dailySelections.userId, dailySelections.dateKey],
      set: { philosophyLine },
    });

  return NextResponse.json({ ok: true });
}
