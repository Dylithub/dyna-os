import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { weekLogs } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getAuthedUserId } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  const { userId, error } = await getAuthedUserId();
  if (error) return error;

  const weekKey = req.nextUrl.searchParams.get("weekKey");
  if (!weekKey) {
    return NextResponse.json({ error: "weekKey required" }, { status: 400 });
  }

  const rows = await db
    .select()
    .from(weekLogs)
    .where(and(eq(weekLogs.userId, userId), eq(weekLogs.weekKey, weekKey)));

  return NextResponse.json(rows[0] ?? null);
}

export async function PUT(req: NextRequest) {
  const { userId, error } = await getAuthedUserId();
  if (error) return error;

  const body = await req.json();
  const { weekKey, ...fields } = body;

  if (!weekKey) {
    return NextResponse.json({ error: "weekKey required" }, { status: 400 });
  }

  await db
    .insert(weekLogs)
    .values({ userId, weekKey, ...fields, updatedAt: new Date().toISOString() })
    .onConflictDoUpdate({
      target: [weekLogs.userId, weekLogs.weekKey],
      set: { ...fields, updatedAt: new Date().toISOString() },
    });

  return NextResponse.json({ ok: true });
}
