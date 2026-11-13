#!/usr/bin/env node
// After an edit: format and lint-fix that one file with Biome, so style never needs a prompt.
// Reads the hook payload on stdin. Never fails the edit: a file Biome does not handle is skipped.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { relative, resolve } from "node:path";

const root = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
let file;
try {
  const payload = JSON.parse(readFileSync(0, "utf8"));
  file = payload.tool_response?.filePath ?? payload.tool_input?.file_path;
} catch {
  process.exit(0);
}
if (!file || !existsSync(file)) process.exit(0);
const inside = relative(root, resolve(file));
if (inside.startsWith("..") || !existsSync(resolve(root, "node_modules/.bin/biome"))) process.exit(0);

spawnSync(resolve(root, "node_modules/.bin/biome"), ["check", "--write", "--no-errors-on-unmatched", inside], {
  cwd: root,
  stdio: "ignore",
});
