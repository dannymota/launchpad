import { defineConfig, devices } from "@playwright/test";

// Browser tests of the built product, as it is after launch. `npm run e2e` builds first.
// Another copy of the product on the same machine may hold the port: `E2E_PORT=8795 npm run e2e`.
const PORT = Number(process.env.E2E_PORT) || 8790;

export default defineConfig({
  testDir: "tests/e2e",
  // One Worker and one database: tests run one after another.
  workers: 1,
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL: `http://127.0.0.1:${PORT}`, trace: "off", screenshot: "only-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "node scripts/e2e-server.mjs",
    env: { PRODUCT_PORT: String(PORT) },
    url: `http://127.0.0.1:${PORT}/health`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
