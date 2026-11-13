import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

// Tests that run inside the Workers runtime, against the real router with local D1 and KV.
// The entry is tests/worker-entry.ts: the Worker with a stand-in for the page renderer, so
// these tests need no build. Pages themselves are covered by the browser tests.
const migrations = await readD1Migrations("../../packages/backend/migrations");

export default defineConfig({
  plugins: [
    cloudflareTest({
      main: "./tests/worker-entry.ts",
      wrangler: { configPath: "./wrangler.jsonc" },
      miniflare: {
        bindings: {
          TEST_MIGRATIONS: migrations,
          APP_ENV: "test",
          // A fixed, obviously fake value: tests must not depend on .dev.vars.
          BETTER_AUTH_SECRET: "test-only-secret-not-used-anywhere-else-0000",
        },
      },
    }),
  ],
  test: {
    include: ["tests/**/*.workers.test.ts"],
  },
});
