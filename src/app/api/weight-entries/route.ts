import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { weightEntries } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getAuthedUserId } from "@/lib/api-auth";

export async function GET() {
  const { userId, error } = await getAuthedUserId();
  if (error) return error;

  const rows = await db
    .select()
    .from(weightEntries)
    .where(eq(weightEntries.userId, userId))
    .orderBy(desc(weightEntries.date));

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const { userId, error } = await getAuthedUserId();
  if (error) return error;

  const { weightLb, date } = await req.json();

  if (!weightLb || !date) {
    return NextResponse.json({ error: "weightLb and date required" }, { status: 400 });
  }

  await db.insert(weightEntries).values({ userId, weightLb, date });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const { userId, error } = await getAuthedUserId();
  if (error) return error;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  await db
    .delete(weightEntries)
    .where(and(eq(weightEntries.id, Number(id)), eq(weightEntries.userId, userId)));

  return NextResponse.json({ ok: true });
}
