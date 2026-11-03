import { sql } from "drizzle-orm";
import { db } from "./index";

// Additive schema changes made after launch, applied on first use so the
// production Turso DB upgrades itself on deploy (no manual migration step).
// Every statement is idempotent; nothing here drops or rewrites data.
let ready: Promise<void> | null = null;

// Two cold-started server instances can race to add the same column;
// the loser's "duplicate column" error just means it's already there
async function addColumn(statement: ReturnType<typeof sql>) {
  try {
    await db.run(statement);
  } catch (e) {
    if (!String(e).includes("duplicate column")) throw e;
  }
}

async function apply() {
  await db.run(sql`
    CREATE TABLE IF NOT EXISTS user_state (
      id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      user_id text NOT NULL REFERENCES users(id) ON DELETE cascade,
      key text NOT NULL,
      value text NOT NULL,
      updated_at text DEFAULT (datetime('now')) NOT NULL
    )
  `);
  await db.run(
    sql`CREATE UNIQUE INDEX IF NOT EXISTS user_state_user_key ON user_state (user_id, key)`
  );

  const columns = await db.all<{ name: string }>(sql`PRAGMA table_info(day_logs)`);
  const has = (name: string) => columns.some((c) => c.name === name);
  if (!has("libido_score")) {
    await addColumn(sql`ALTER TABLE day_logs ADD COLUMN libido_score integer`);
  }
  if (!has("spend_amount")) {
    await addColumn(sql`ALTER TABLE day_logs ADD COLUMN spend_amount real`);
  }
  if (!has("todos")) {
    await addColumn(sql`ALTER TABLE day_logs ADD COLUMN todos text`);
  }
}

export function ensureSchema(): Promise<void> {
  if (!ready) {
    // Reset on failure so the next request retries instead of caching the error
    ready = apply().catch((e) => {
      ready = null;
      throw e;
    });
  }
  return ready;
}
