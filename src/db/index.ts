import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema";

const url = process.env.TURSO_DATABASE_URL!;

// Safety net: local dev should use file:local.db, never the production Turso DB.
if (process.env.NODE_ENV === "development" && url.startsWith("libsql://")) {
  console.warn(
    "\n⚠️  WARNING: dev server is connected to a REMOTE Turso database (" +
      url +
      ").\n   Local development should use TURSO_DATABASE_URL=file:local.db in .env.local\n"
  );
}

const client = createClient({
  url,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export const db = drizzle(client, { schema });
