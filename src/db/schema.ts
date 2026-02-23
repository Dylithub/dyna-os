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
    checkInNote: text("check_in_note").default(""),
    calories: integer("calories"),
    protein: integer("protein"),
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
    strengthArmsChest: integer("strength_arms_chest", { mode: "boolean" }).default(false),
    strengthLegs: integer("strength_legs", { mode: "boolean" }).default(false),
    strengthCoreBack: integer("strength_core_back", { mode: "boolean" }).default(false),
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
