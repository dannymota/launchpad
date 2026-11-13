#!/usr/bin/env node
// When the agent is about to stop: typecheck and run the boundary test. A failure sends it
// back to work once with the output; if the retry still fails, the person is told instead,
// so a broken check can never trap a session in a loop.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
let payload = {};
try {
  payload = JSON.parse(readFileSync(0, "utf8"));
} catch {}

const run = (command, args) => spawnSync(command, args, { cwd: root, encoding: "utf8" });

// Nothing to check before dependencies exist, or when no file has changed since the last commit.
if (!existsSync(resolve(root, "node_modules"))) process.exit(0);
const changed = run("git", ["status", "--porcelain"]);
if (changed.status === 0 && changed.stdout.trim() === "") process.exit(0);

const failures = [];
for (const [label, args] of [
  ["typecheck", ["run", "--silent", "typecheck"]],
  ["boundary test", ["test", "--silent"]],
]) {
  const result = run("npm", args);
  if (result.status !== 0)
    failures.push(`${label} failed:\n${`${result.stdout}\n${result.stderr}`.trim().slice(-3000)}`);
}
if (failures.length === 0) process.exit(0);

const report = failures.join("\n\n");
if (payload.stop_hook_active) {
  // Already sent back once for this stop. Let it end, and say so.
  console.log(JSON.stringify({ systemMessage: `Checks still fail after a retry:\n${report.slice(0, 1500)}` }));
  process.exit(0);
}
console.log(JSON.stringify({ decision: "block", reason: `Fix these before finishing.\n\n${report}` }));
