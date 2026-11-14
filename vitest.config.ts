import { defineConfig } from "vitest/config";

// Tests that run in Node: the repo-wide rules in tests/ and each package's unit tests.
// Tests that need the Workers runtime (D1, KV, the Worker itself) live in apps/*/tests and
// run with `npm run test:workers`.
export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts", "packages/*/tests/**/*.test.ts"],
  },
});
