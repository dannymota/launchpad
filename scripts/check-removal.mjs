#!/usr/bin/env node
// Proves that a part can be removed: on a copy of this repository it removes the part, then
// runs the full check and the build. Nothing here is touched.
//
//   node scripts/check-removal.mjs <name> [<name> ...]   one copy per name
//   node scripts/check-removal.mjs --all                 every part in scripts/removable.mjs
//   node scripts/check-removal.mjs a+b                   remove several from the same copy
//   node scripts/check-removal.mjs --feature note [a]    scaffold a feature first (`npm run new:feature`)
//
// CI runs one name per job (.github/workflows/check.yml).
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PARTS } from "./removable.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const keep = args.includes("--keep");
/** `--feature note` scaffolds a feature on the copy first, which proves the generator too. */
const feature = args.includes("--feature") ? args[args.indexOf("--feature") + 1] : undefined;
const named = args.filter((arg, index) => !arg.startsWith("--") && args[index - 1] !== "--feature");
const names = args.includes("--all") ? Object.keys(PARTS) : named.length || !feature ? named : ["nothing"];
if (names.length === 0) {
  console.error(`Usage: node scripts/check-removal.mjs <name>... | --all   (parts: ${Object.keys(PARTS).join(", ")})`);
  process.exit(1);
}

const sh = (cwd, command, commandArgs) => execFileSync(command, commandArgs, { cwd, stdio: "inherit" });

/** A copy of the working tree as git sees it, with the installed packages alongside. */
function copyOfRepo() {
  const copy = mkdtempSync(join(process.env.REMOVAL_TMP ?? tmpdir(), "removal-"));
  const files = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], {
    cwd: ROOT,
    maxBuffer: 64 * 1024 * 1024,
  })
    .toString("utf8")
    .split("\0")
    .filter((file) => file && existsSync(join(ROOT, file)));
  for (const file of files) {
    mkdirSync(dirname(join(copy, file)), { recursive: true });
    cpSync(join(ROOT, file), join(copy, file));
  }
  // The copy is its own repository, so the remove script can list its files.
  sh(copy, "git", ["init", "-q"]);
  for (const modules of ["node_modules", "apps/web/node_modules", "packages/backend/node_modules"]) {
    if (existsSync(join(ROOT, modules)))
      cpSync(join(ROOT, modules), join(copy, modules), { recursive: true, verbatimSymlinks: true });
  }
  return copy;
}

/** Files in the copy that still carry a marker for one of `parts`. */
function leftoverMarkers(copy, parts) {
  const files = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], {
    cwd: copy,
    maxBuffer: 64 * 1024 * 1024,
  })
    .toString("utf8")
    .split("\0")
    .filter(Boolean);
  // These describe the markers, so they contain them.
  const about = ["scripts/remove.mjs", "scripts/removable.mjs", "tests/removable.test.ts", ".claude/rules/modules.md"];
  return files.filter((file) => {
    if (!/\.(ts|tsx|mjs|js|json|jsonc|md|css|yml|yaml|example)$/.test(file) || about.includes(file)) return false;
    const text = readFileSync(join(copy, file), "utf8");
    // A marker is a comment on a line of its own.
    return parts.some((part) =>
      new RegExp(`^\\s*(?://|#|\\{/\\*|/\\*|<!--)\\s*(?:>>>|<<<)\\s*${part}(?![\\w-])`, "m").test(text),
    );
  });
}

const failed = [];
for (const name of names) {
  const parts = name === "nothing" ? [] : name.split("+");
  console.log(`\n=== ${name}: removing on a copy ===`);
  const copy = copyOfRepo();
  try {
    if (!existsSync(join(copy, "node_modules"))) sh(copy, "npm", ["ci", "--no-audit", "--no-fund"]);
    if (feature) sh(copy, "node", ["scripts/new-feature.mjs", feature]);
    for (const part of parts) sh(copy, "node", ["scripts/remove.mjs", part]);
    const left = leftoverMarkers(copy, parts);
    if (left.length) throw new Error(`markers remain in: ${left.join(", ")}`);
    sh(copy, "npm", ["run", "check"]);
    sh(copy, "npm", ["run", "build"]);
    console.log(`=== ${name}: check and build pass without it ===`);
  } catch (error) {
    failed.push(name);
    console.error(String(error.message ?? error).split("\n")[0]);
    console.error(`=== ${name}: FAILED (copy ${keep ? `kept at ${copy}` : "deleted; pass --keep to inspect it"}) ===`);
  }
  if (!keep) rmSync(copy, { recursive: true, force: true });
}

if (failed.length) {
  console.error(`\nRemoval left the repository broken for: ${failed.join(", ")}`);
  process.exit(1);
}
console.log(`\nEvery removal checked: ${names.join(", ")}`);
