import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function getAuthedUserId(): Promise<
  { userId: string; error: null } | { userId: null; error: NextResponse }
> {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      userId: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { userId: session.user.id, error: null };
}
