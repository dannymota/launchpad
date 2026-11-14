#!/usr/bin/env node
// Starts the built Worker for the browser tests: a fresh local database every run, the
// product as it is after launch (public, own sign-in), and nobody standing in for
// Cloudflare Access. Playwright starts and stops this (playwright.config.ts), and so does
// scripts/shots.mjs.
import { execFileSync, spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// The port and the database folder are the browser tests' by default; `npm run shots` runs a
// second copy beside them by setting both.
const E2E_PORT = Number(process.env.PRODUCT_PORT) || 8790;
/** Where this run's local database lives. The mail outbox is read from it. */
const E2E_STATE = process.env.PRODUCT_STATE || ".wrangler/e2e";

const WEB = join(resolve(dirname(fileURLToPath(import.meta.url)), ".."), "apps/web");

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (!existsSync(join(WEB, "dist/server/wrangler.json"))) {
    console.error("There is no build to test. Run `npm run build` first (`npm run e2e` does).");
    process.exit(1);
  }
  rmSync(join(WEB, E2E_STATE), { recursive: true, force: true });
  execFileSync("npx", ["wrangler", "d1", "migrations", "apply", "DB", "--local", "--persist-to", E2E_STATE], {
    cwd: WEB,
    stdio: "inherit",
    env: { ...process.env, CI: "1" },
  });
  const settings = {
    APP_ENV: "local",
    BETTER_AUTH_SECRET: randomBytes(36).toString("base64"),
    DEV_PRESET: "public-product",
    // Set, and empty: nobody is let through in place of Cloudflare Access.
    DEV_ACCESS_EMAIL: "",
  };
  const server = spawn(
    "npx",
    [
      "wrangler",
      "dev",
      "--config",
      "dist/server/wrangler.json",
      "--persist-to",
      E2E_STATE,
      "--port",
      String(E2E_PORT),
      "--ip",
      "127.0.0.1",
      "--inspector-port",
      String(E2E_PORT + 552),
      ...Object.entries(settings).flatMap(([name, value]) => ["--var", `${name}:${value}`]),
    ],
    { cwd: WEB, stdio: "inherit" },
  );
  for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => server.kill(signal));
  server.on("exit", (code) => process.exit(code ?? 0));
}
