import { sql } from "drizzle-orm";
import { db, closeDatabase } from "./client.js";

try {
  const result = await db.execute(sql`SELECT 1 AS connected`);
  console.log(result.rows);
} finally {
  await closeDatabase();
}
