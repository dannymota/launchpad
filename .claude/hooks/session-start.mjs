#!/usr/bin/env node
// At the start of a session: make the checks runnable and say where things stand.
// What it prints is added to the agent's context, so it stays short.
import { spawnSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

const root = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const at = (path) => resolve(root, path);
const run = (command, args, cwd = root) =>
  spawnSync(command, args, { cwd, encoding: "utf8", env: { ...process.env, CI: "1" } });
const notes = [];

if (!existsSync(at("node_modules"))) {
  const install = run("npm", ["ci", "--no-audit", "--no-fund"]);
  notes.push(install.status === 0 ? "Installed dependencies." : `npm ci failed: ${install.stderr.trim().slice(-400)}`);
}

// Impeccable (the design skill) looks for its engine next to its launcher before it downloads
// one, and runs what it finds there on its version alone. So the copy npm installed is linked
// there only after it matches the checksum the skill ships for it: the same engine, with
// nothing downloaded, and the design check after each edit works with no network access.
function linkDesignEngine() {
  const os = { darwin: "darwin", linux: "linux", win32: "windows" }[process.platform];
  const arch = { arm64: "arm64", x64: "x64" }[process.arch];
  const exe = os === "windows" ? "impeccable.exe" : "impeccable";
  const engine = at(`node_modules/@impeccable/cli-${os}-${arch}/bin/${exe}`);
  const scripts = at(".claude/skills/impeccable/scripts");
  if (!existsSync(engine) || !existsSync(scripts)) return;
  const link = join(scripts, "bin", `${os}-${arch}`, exe);
  const linked = lstatSync(link, { throwIfNoEntry: false });
  // Something a person put there by hand is theirs: leave it.
  if (linked && !linked.isSymbolicLink()) return;
  try {
    const version = readFileSync(join(scripts, "VERSION"), "utf8").trim();
    const asset = `impeccable-${os}-${arch}${os === "windows" ? ".exe" : ""}`;
    const expected = readFileSync(join(scripts, "engine-checksums.txt"), "utf8")
      .split("\n")
      .map((line) => line.trim().split(/\s+/))
      .find(([forVersion, forAsset]) => forVersion === version && forAsset === asset)?.[2];
    const actual = createHash("sha256").update(readFileSync(engine)).digest("hex");
    if (actual !== expected) {
      rmSync(link, { force: true });
      notes.push("The design engine npm installed is not the one the Impeccable skill pins, so it was not linked.");
      return;
    }
    if (linked && realpathSync(link) === realpathSync(engine)) return;
    mkdirSync(dirname(link), { recursive: true });
    rmSync(link, { force: true });
    symlinkSync(relative(dirname(link), engine), link);
  } catch {
    // No symlinks here (some Windows setups): the launcher then fetches its own checked copy.
  }
}
linkDesignEngine();

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

// Where the product stands: its name and access preset, and whether it has a brief yet.
try {
  const config = readFileSync(at("product/product.config.ts"), "utf8");
  const name = /\bname:\s*"([^"]+)"/.exec(config)?.[1] ?? "unnamed";
  const preset = /\bpreset:\s*"([^"]+)"/.exec(config)?.[1] ?? "unknown";
  const brief = existsSync(at("product/brief.md"))
    ? "The brief is product/brief.md."
    : "There is no product/brief.md yet: `/start <idea>` writes one.";
  notes.push(`Product: ${name}, access preset "${preset}". ${brief}`);
} catch {}

notes.push(
  "Checks: `npm run check` (lint, types, boundaries, Workers-runtime tests). Read AGENTS.md before changing code.",
);
console.log(notes.join("\n"));
