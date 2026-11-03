import { sqliteTable, text, integer, real, uniqueIndex } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// ── Auth.js tables ──────────────────────────────────────────────

export const users = sqliteTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "timestamp" }),
  image: text("image"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const accounts = sqliteTable("accounts", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  provider: text("provider").notNull(),
  providerAccountId: text("provider_account_id").notNull(),
  refresh_token: text("refresh_token"),
  access_token: text("access_token"),
  expires_at: integer("expires_at"),
  token_type: text("token_type"),
  scope: text("scope"),
  id_token: text("id_token"),
  session_state: text("session_state"),
});

export const sessions = sqliteTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: integer("expires", { mode: "timestamp" }).notNull(),
});

export const verificationTokens = sqliteTable("verification_tokens", {
  identifier: text("identifier").notNull(),
  token: text("token").notNull(),
  expires: integer("expires", { mode: "timestamp" }).notNull(),
});

// ── App data tables ─────────────────────────────────────────────

export const dayLogs = sqliteTable(
  "day_logs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    dateKey: text("date_key").notNull(), // "YYYY-MM-DD"
    moodScore: integer("mood_score"),
    energyScore: integer("energy_score"),
    stressScore: integer("stress_score"),
    libidoScore: integer("libido_score"), // added after launch — see db/ensure-schema.ts
    checkInNote: text("check_in_note").default(""),
    calories: integer("calories"),
    protein: integer("protein"),
    spendAmount: real("spend_amount"), // added after launch — see db/ensure-schema.ts
    todos: text("todos"), // JSON array of strings; added after launch
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [uniqueIndex("day_logs_user_date").on(table.userId, table.dateKey)]
);

export const weekLogs = sqliteTable(
  "week_logs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    weekKey: text("week_key").notNull(), // "YYYY-Www"
    zone2Target: integer("zone2_target").default(4),
    zone2Done: integer("zone2_done").default(0),
    zone2MinutesEach: integer("zone2_minutes_each").default(40),
    strengthTarget: integer("strength_target").default(3),
    strengthDay1: integer("strength_arms_chest"), // Day of week (1-7) or null
    strengthDay2: integer("strength_legs"), // Repurposed columns, keeping DB names for compat
    strengthDay3: integer("strength_core_back"),
    zone2Days: text("zone2_days"), // JSON array of day numbers, e.g. "[1,3,5,null]"
    completions: text("completions"), // JSON array of {slotId, completedAt} for new exercise model
    workoutSessions: text("workout_sessions"), // JSON array of WorkoutSession (per-exercise kg/reps/sets)
    weighInLb: real("weigh_in_lb"),
    weighInTimestamp: text("weigh_in_timestamp"),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [uniqueIndex("week_logs_user_week").on(table.userId, table.weekKey)]
);

export const weightEntries = sqliteTable("weight_entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  weightLb: real("weight_lb").notNull(),
  date: text("date").notNull(), // "YYYY-MM-DD"
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const dailySelections = sqliteTable(
  "daily_selections",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    dateKey: text("date_key").notNull(),
    philosophyLine: integer("philosophy_line"),
  },
  (table) => [
    uniqueIndex("daily_selections_user_date").on(table.userId, table.dateKey),
  ]
);

// Whole-object client state that has no table of its own: settings (incl.
// workout routines), the shopping list, and archived weekly summaries.
// One JSON row per key per user.
export const userState = sqliteTable(
  "user_state",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    key: text("key").notNull(), // see USER_STATE_KEYS in lib/sync-transform.ts
    value: text("value").notNull(), // JSON
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [uniqueIndex("user_state_user_key").on(table.userId, table.key)]
);
