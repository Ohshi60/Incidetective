import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db } from "./client.js";

/**
 * Applies pending Drizzle migrations from ./drizzle (relative to the working
 * directory). Runs on API startup; safe with a single API instance.
 */
export async function runMigrations(): Promise<void> {
  await migrate(db, { migrationsFolder: "./drizzle" });
}
