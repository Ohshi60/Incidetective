import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import type { TestProject } from "vitest/node";

export default async function setup(project: TestProject) {
  const container = await new PostgreSqlContainer("postgres:17").start();

  try {
    const connectionString = container.getConnectionUri();
    const pool = new Pool({ connectionString });

    try {
      await migrate(drizzle({ client: pool }), {
        migrationsFolder: "./drizzle",
      });
    } finally {
      await pool.end();
    }

    project.provide("databaseUrl", connectionString);
  } catch (error) {
    await container.stop();
    throw error;
  }

  return async () => {
    await container.stop();
  };
}

declare module "vitest" {
  export interface ProvidedContext {
    databaseUrl: string;
  }
}
