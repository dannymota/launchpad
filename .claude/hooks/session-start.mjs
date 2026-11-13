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

// A local-only signing secret, so `npm run dev` and the local Worker start. Never committed.
if (!existsSync(at("apps/web/.dev.vars"))) {
  writeFileSync(at("apps/web/.dev.vars"), `BETTER_AUTH_SECRET=${randomBytes(36).toString("base64")}\n`, {
    mode: 0o600,
  });
  notes.push("Created apps/web/.dev.vars with a random local secret.");
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
