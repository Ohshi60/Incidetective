import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

try {
  await migrate(drizzle({ client: pool }), {
    migrationsFolder: "./drizzle",
  });

  console.log("Database migrations applied");
} catch (error) {
  console.error("Database migration failed:", error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
