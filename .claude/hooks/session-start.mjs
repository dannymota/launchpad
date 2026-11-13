#!/usr/bin/env node
// At the start of a session: make the checks runnable and say where things stand.
// What it prints is added to the agent's context, so it stays short.
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const at = (path) => resolve(root, path);
const run = (command, args, cwd = root) =>
  spawnSync(command, args, { cwd, encoding: "utf8", env: { ...process.env, CI: "1" } });
const notes = [];

if (!existsSync(at("node_modules"))) {
  const install = run("npm", ["ci", "--no-audit", "--no-fund"]);
  notes.push(install.status === 0 ? "Installed dependencies." : `npm ci failed: ${install.stderr.trim().slice(-400)}`);
}

// Local-only settings, never committed: a random signing secret, and who to be in place of
// Cloudflare Access, which does not exist on a developer machine.
if (!existsSync(at("apps/web/.dev.vars"))) {
  const lines = [
    "APP_ENV=local",
    `BETTER_AUTH_SECRET=${randomBytes(36).toString("base64")}`,
    "DEV_ACCESS_EMAIL=dev@example.com",
    "ADMIN_EMAILS=dev@example.com",
  ];
  writeFileSync(at("apps/web/.dev.vars"), `${lines.join("\n")}\n`, { mode: 0o600 });
  notes.push("Created apps/web/.dev.vars: a random local secret, and dev@example.com as the local Access identity.");
}

if (existsSync(at("node_modules")) && !existsSync(at("apps/web/.wrangler/state/v3/d1"))) {
  const migrate = run("npx", ["wrangler", "d1", "migrations", "apply", "DB", "--local"], at("apps/web"));
  notes.push(
    migrate.status === 0
      ? "Applied migrations to the local database."
      : "Local migrations failed: run `npm run db:migrate:local`.",
  );
}

notes.push(
  "Checks: `npm run check` (lint, types, boundaries, Workers-runtime tests). Read AGENTS.md before changing code.",
);
console.log(notes.join("\n"));
