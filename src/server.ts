import { buildApp } from "./app.js";
import { runMigrations } from "./db/migrate.js";

const app = buildApp();

try {
  await runMigrations();
  app.log.info("Database migrations applied");
  await app.listen({ port: 3000, host: "0.0.0.0" });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
