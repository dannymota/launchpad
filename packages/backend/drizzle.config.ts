// Turns the tables in src/db/schema into SQL migrations: `npm run db:generate`.
// Wrangler, not drizzle-kit, applies them (`wrangler d1 migrations apply`), so Wrangler
// keeps the history, takes a backup first and rolls back a migration that fails.
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/db/schema/index.ts",
  out: "./migrations",
});
