#!/usr/bin/env node
// Removes a surface or an optional module from this product, for good.
//
//   npm run remove -- <name>            remove it
//   npm run remove -- <name> --dry-run  show what would change, change nothing
//   npm run remove                      list what can be removed
//
// What belongs to each part is listed in scripts/removable.mjs: folders and files to
// delete, and packages to drop. Lines a part adds to shared files sit between markers,
//
//   // >>> payments
//   ...
//   // <<< payments
//
// and are cut out with their markers. When tables go, a migration that drops them is
// generated. Afterwards run `npm run check`: it must pass with the part gone.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { PARTS } from "./removable.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const name = args.find((arg) => !arg.startsWith("--"));

const TEXT_FILE = /\.(ts|tsx|mts|js|jsx|mjs|cjs|json|jsonc|md|css|yml|yaml|toml|txt|example)$/;
const escaped = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** A marker line, in a line comment (// or #), a JSX comment or an HTML comment. */
const marker = (arrows, part) =>
  new RegExp(`^\\s*(?://|#|\\{/\\*|/\\*|<!--)\\s*${arrows}\\s*${escaped(part)}(?![\\w-])`);

function run(command, commandArgs, cwd = ROOT) {
  console.log(`  $ ${command} ${commandArgs.join(" ")}`);
  execFileSync(command, commandArgs, { cwd, stdio: "inherit" });
}

/** Every file git knows about or would add, so node_modules and build output are never read. */
function sourceFiles() {
  const out = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], {
    cwd: ROOT,
    maxBuffer: 64 * 1024 * 1024,
  });
  return out
    .toString("utf8")
    .split("\0")
    .filter((file) => file && TEXT_FILE.test(file) && existsSync(join(ROOT, file)));
}

/** `text` without the blocks marked for `part`, and how many blocks that was. */
export function cutMarked(text, part, file = "") {
  const open = marker(">>>", part);
  const close = marker("<<<", part);
  const kept = [];
  let cut = 0;
  let inside = false;
  for (const line of text.split("\n")) {
    if (!inside && open.test(line)) {
      inside = true;
      cut += 1;
    } else if (inside && close.test(line)) {
      inside = false;
    } else if (!inside && close.test(line)) {
      throw new Error(`${file}: "<<< ${part}" without a ">>> ${part}" before it`);
    } else if (!inside) {
      kept.push(line);
    }
  }
  if (inside) throw new Error(`${file}: ">>> ${part}" is never closed`);
  // Cutting a block can leave two blank lines where it stood.
  return { text: cut ? kept.join("\n").replace(/\n{3,}/g, "\n\n") : text, cut };
}

function inside(root, target) {
  const full = resolve(root, target);
  if (full !== root && !full.startsWith(root + sep)) throw new Error(`${target} is outside the repository`);
  return full;
}

function list() {
  console.log("Removable parts:\n");
  for (const [part, { what }] of Object.entries(PARTS)) console.log(`  ${part.padEnd(10)} ${what}`);
  console.log("\nRemove one with: npm run remove -- <name>   (add --dry-run to preview)");
}

function main() {
  if (!name) return list();
  const part = PARTS[name];
  if (!part) {
    console.error(`"${name}" is not something this script removes.\n`);
    list();
    process.exit(1);
  }
  console.log(`${dryRun ? "Would remove" : "Removing"} ${name}: ${part.what}\n`);
  let changed = false;

  // 1. Whole folders and files.
  for (const path of part.paths ?? []) {
    const full = inside(ROOT, path);
    if (!existsSync(full)) continue;
    changed = true;
    console.log(`  delete  ${path}`);
    if (!dryRun) rmSync(full, { recursive: true, force: true });
  }

  // 2. Marked blocks in the files that stay.
  const edited = [];
  for (const file of sourceFiles()) {
    const before = readFileSync(join(ROOT, file), "utf8");
    if (!before.includes(`>>> ${name}`)) continue;
    const { text, cut } = cutMarked(before, name, file);
    if (!cut) continue;
    changed = true;
    edited.push(file);
    console.log(`  cut     ${file} (${cut} block${cut === 1 ? "" : "s"})`);
    if (!dryRun) writeFileSync(join(ROOT, file), text);
  }

  // 3. Files that take another form once the part is gone.
  for (const [path, content] of Object.entries(part.write ?? {})) {
    const full = inside(ROOT, path);
    if (existsSync(full) && readFileSync(full, "utf8") === content) continue;
    changed = true;
    edited.push(path);
    console.log(`  write   ${path}`);
    if (!dryRun) writeFileSync(full, content);
  }

  // 4. Packages and scripts only it used.
  const installs = new Set();
  for (const [folder, entries] of Object.entries(part.packageJson ?? {})) {
    const file = join(inside(ROOT, folder), "package.json");
    if (!existsSync(file)) continue;
    const manifest = JSON.parse(readFileSync(file, "utf8"));
    let touched = false;
    for (const [section, keys] of Object.entries(entries)) {
      for (const key of keys) {
        if (manifest[section] && key in manifest[section]) {
          delete manifest[section][key];
          touched = true;
          console.log(`  drop    ${join(folder, "package.json")} ${section}.${key}`);
        }
      }
    }
    if (!touched) continue;
    changed = true;
    // apps/mobile keeps its own lockfile; everything else installs from the root.
    installs.add(folder === "apps/mobile" ? "apps/mobile" : ".");
    if (!dryRun) writeFileSync(file, `${JSON.stringify(manifest, null, 2)}\n`);
  }

  if (!changed) return console.log(`Nothing of ${name} is left in this repository.`);
  if (dryRun) return console.log("\nDry run: nothing was changed.");

  console.log("\nUpdating what is generated from the source:");
  for (const folder of installs) {
    if (existsSync(join(ROOT, folder, "package.json"))) {
      run("npm", ["install", "--no-audit", "--no-fund"], join(ROOT, folder));
    }
  }
  // The sign-in tables are generated from the plugins in use; then the migration that drops what went.
  if (part.regenerate?.includes("auth")) run("npm", ["run", "auth:generate", "-w", "@app/backend"]);
  if (part.regenerate?.includes("db")) run("npm", ["run", "db:generate"]);
  if (part.regenerate?.includes("theme")) run("npm", ["run", "theme"]);
  const toFormat = edited.filter(
    (file) => existsSync(join(ROOT, file)) && /\.(ts|tsx|mjs|js|json|jsonc|css)$/.test(file),
  );
  if (toFormat.length) run("npx", ["biome", "check", "--write", "--no-errors-on-unmatched", ...toFormat]);

  console.log(`\nRemoved ${name}. Now run: npm run check`);
  for (const note of part.notes ?? []) console.log(`Note: ${note}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
