#!/usr/bin/env node
// Removes a surface or an optional module from this product, for good.
//
//   npm run remove -- <name>            remove it
//   npm run remove -- <name> --dry-run  show what would change, change nothing
//   npm run remove                      list what can be removed
//
// What belongs to each part is listed in scripts/removable.mjs: folders and files to
// delete, packages to drop, and the lines and wording about it in the documents. Lines a part
// adds to shared code sit between markers,
//
//   // >>> payments
//   ...
//   // <<< payments
//
// and are cut out with their markers. Imports are never marked: an import or re-export of a
// deleted file is dropped, and so is any import the cuts leave unused (the comment a file
// opens with stays, whichever import it sat on). When tables go, a migration that drops them
// is generated and applied to the local database. Last, the design files (DESIGN.md,
// PRODUCT.md) are written again. Afterwards run `npm run check`: it must pass.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, posix, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { DOCUMENTS, PARTS } from "./removable.mjs";

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
  // and a blank line at the end of the file.
  return {
    text: cut
      ? kept
          .join("\n")
          .replace(/\n{3,}/g, "\n\n")
          .replace(/\n+$/, "\n")
      : text,
    cut,
  };
}

const CLAUSE = String.raw`(?:type\s+)?(?:\*(?:\s+as\s+[\w$]+)?|\{[^}]*\}|[\w$]+(?:\s*,\s*(?:\{[^}]*\}|\*\s+as\s+[\w$]+))?)`;
const FROM_RELATIVE = new RegExp(
  String.raw`^[ \t]*(?:import|export)\s+${CLAUSE}\s*from\s+["'](\.{1,2}/[^"']+)["'];?[ \t]*\n`,
  "gm",
);

/**
 * `text` (the contents of `file`) without the import and export statements that take from a
 * deleted file or folder. This is why a marker is never needed around such a statement.
 */
export function dropDangling(text, file, deleted) {
  let dropped = 0;
  const out = text.replace(FROM_RELATIVE, (statement, spec) => {
    const target = posix.normalize(posix.join(posix.dirname(file), spec));
    const candidates = [target, `${target}.ts`, `${target}.tsx`, `${target}.mjs`];
    const gone = deleted.some((path) =>
      candidates.some((candidate) => candidate === path || candidate.startsWith(`${path}/`)),
    );
    if (gone) dropped += 1;
    return gone ? "" : statement;
  });
  return { text: out, dropped };
}

/**
 * `text` without the lines that contain one of `needles`, and how many lines that was. Where
 * the lines that went stood between two blank lines, one blank line is left, so a document no
 * formatter looks at stays tidy.
 */
export function dropLines(text, needles) {
  const kept = [];
  let dropped = 0;
  let justDropped = false;
  for (const line of text.split("\n")) {
    if (needles.some((needle) => line.includes(needle))) {
      dropped += 1;
      justDropped = true;
      continue;
    }
    const doubled = justDropped && line.trim() === "" && (kept.length === 0 || kept.at(-1).trim() === "");
    if (!doubled) kept.push(line);
    justDropped = false;
  }
  return { text: dropped ? kept.join("\n") : text, dropped };
}

/** `text` with every `find` of the `[find, replacement]` pairs replaced, and how many places that was. */
export function reword(text, pairs) {
  let out = text;
  let replaced = 0;
  for (const [find, replacement] of pairs) {
    const pieces = out.split(find);
    replaced += pieces.length - 1;
    out = pieces.join(replacement);
  }
  return { text: out, replaced };
}

const SCRIPT_FILE = /\.(ts|tsx|mts|js|jsx|mjs|cjs)$/;
const DIRECTIVE = /^(["'])use \w+\1;?$/;
/** A comment written for a tool about the line under it. It belongs to that line, not to the file. */
const FOR_A_TOOL = /^\/\/\s*(biome-ignore|eslint-disable|@ts-|prettier-ignore|knip-ignore)/;

/**
 * The comment a script opens with: `lines` of it, starting at line `start`, after a "#!" line,
 * directives such as "use client" and blank lines. No lines when the file opens with code.
 */
function opening(text) {
  const all = text.split("\n");
  let start = all[0]?.startsWith("#!") ? 1 : 0;
  while (start < all.length && (all[start].trim() === "" || DIRECTIVE.test(all[start].trim()))) start += 1;
  let end = start;
  let inBlock = false;
  for (; end < all.length; end += 1) {
    const line = all[end].trim();
    const opens = !inBlock && line.startsWith("/*");
    if (!inBlock && !opens && !line.startsWith("//")) break;
    if (inBlock || opens) {
      const close = line.indexOf("*/", opens ? 2 : 0);
      // Code after the comment on the same line: this is no comment of its own.
      if (close >= 0 && close + 2 < line.length) return { start, lines: [] };
      inBlock = close < 0;
    }
  }
  if (inBlock) return { start, lines: [] };
  while (end > start && FOR_A_TOOL.test(all[end - 1].trim())) end -= 1;
  return { start, lines: all.slice(start, end) };
}

/** The comment a script opens with, as text. Empty when it opens with code. */
export function leadingComment(text) {
  return opening(text).lines.join("\n");
}

/**
 * `after` with the comment `before` opened with. Biome's fix for an unused import takes the
 * comment above the import with it, and at the top of a file that comment is the file's own.
 */
export function keepLeadingComment(before, after) {
  const was = opening(before);
  if (!was.lines.length) return after;
  const all = after.split("\n");
  const now = opening(after);
  if (was.lines.every((line, index) => all[now.start + index] === line)) return after;
  const rest = all.slice(now.start);
  // On another import the comment sits as it did. On anything else a blank line keeps it the
  // file's comment, not that statement's.
  const gap = /^\s*import\b/.test(rest[0] ?? "") ? [] : [""];
  return [...before.split("\n").slice(0, was.start), ...was.lines, ...gap, ...rest].join("\n");
}

/** True for the documents that describe the product (the list is DOCUMENTS in removable.mjs). */
export function isDocument(file) {
  return DOCUMENTS.include.some((pattern) => pattern.test(file)) && !DOCUMENTS.exclude.some((p) => p.test(file));
}

/**
 * Where `words` still stand in `text`, as `{ line, word }` with lines counted from 1. A word is
 * matched whole and in its own case, a plural included: "Expo" is found in "Expo's" and not
 * in "Export" or "expose".
 */
export function tracesIn(text, words) {
  const patterns = words.map((word) => {
    const before = /^\w/.test(word) ? "(?<!\\w)" : "";
    const after = /\w$/.test(word) ? "s?(?!\\w)" : "";
    return [word, new RegExp(`${before}${escaped(word)}${after}`)];
  });
  return text
    .split("\n")
    .flatMap((line, index) =>
      patterns.filter(([, pattern]) => pattern.test(line)).map(([word]) => ({ line: index + 1, word })),
    );
}

function inside(root, target) {
  const full = resolve(root, target);
  if (full !== root && !full.startsWith(root + sep)) throw new Error(`${target} is outside the repository`);
  return full;
}

/**
 * Drops the imports that nothing uses any more from `files`, with Biome's fix for them. That
 * fix removes the comment above an import along with it, so the comment each script opens
 * with is put back when it went with the file's first import.
 */
function dropUnusedImports(files) {
  const scripts = files.filter((file) => SCRIPT_FILE.test(file));
  const before = new Map(scripts.map((file) => [file, readFileSync(join(ROOT, file), "utf8")]));
  run("npx", [
    "biome",
    "lint",
    "--write",
    "--unsafe",
    "--only=correctness/noUnusedImports",
    "--no-errors-on-unmatched",
    ...files,
  ]);
  for (const [file, text] of before) {
    const after = readFileSync(join(ROOT, file), "utf8");
    const kept = keepLeadingComment(text, after);
    if (kept === after) continue;
    console.log(`  kept    ${file} (the comment it opens with)`);
    writeFileSync(join(ROOT, file), kept);
  }
}

/** Applies the migrations to the local database. False when that could not be done: a removal does not fail on it. */
function migrateLocally() {
  console.log("  $ npm run db:migrate:local");
  try {
    // CI=1: wrangler applies without asking, as it does at the start of a session.
    execFileSync("npm", ["run", "db:migrate:local"], { cwd: ROOT, stdio: "inherit", env: { ...process.env, CI: "1" } });
    return true;
  } catch {
    return false;
  }
}

/** The parts this repository still has: something of each one's own is on disk. */
function list() {
  const here = Object.entries(PARTS).filter(([, part]) =>
    (part.paths ?? []).some((path) => existsSync(join(ROOT, path))),
  );
  if (!here.length) return console.log("Every optional part has been removed from this repository.");
  console.log("Removable parts:\n");
  for (const [part, { what }] of here) console.log(`  ${part.padEnd(10)} ${what}`);
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
  const deleted = [];
  for (const path of part.paths ?? []) {
    const full = inside(ROOT, path);
    if (!existsSync(full)) continue;
    deleted.push(path);
    changed = true;
    console.log(`  delete  ${path}`);
    if (!dryRun) rmSync(full, { recursive: true, force: true });
  }

  // 2. Marked blocks in the files that stay.
  const edited = [];
  for (const file of sourceFiles()) {
    // In a dry run the deleted files are still there; they are not part of what stays.
    if (deleted.some((path) => file === path || file.startsWith(`${path}/`))) continue;
    const before = readFileSync(join(ROOT, file), "utf8");
    const marked = before.includes(`>>> ${name}`) ? cutMarked(before, name, file) : { text: before, cut: 0 };
    // Imports and re-exports of what was just deleted go too, marked or not.
    const dangling = /\.(ts|tsx|mjs)$/.test(file)
      ? dropDangling(marked.text, file, deleted)
      : { text: marked.text, dropped: 0 };
    if (!marked.cut && !dangling.dropped) continue;
    changed = true;
    edited.push(file);
    const what = [
      marked.cut && `${marked.cut} block${marked.cut === 1 ? "" : "s"}`,
      dangling.dropped && `${dangling.dropped} import${dangling.dropped === 1 ? "" : "s"}`,
    ];
    console.log(`  cut     ${file} (${what.filter(Boolean).join(", ")})`);
    if (!dryRun) writeFileSync(join(ROOT, file), dangling.text);
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

  // 4. What the documents and comments say about it, where a marker would show: whole lines
  //    are dropped by the text they contain, and wording inside a sentence is replaced.
  for (const path of new Set([...Object.keys(part.dropLines ?? {}), ...Object.keys(part.replace ?? {})])) {
    const full = inside(ROOT, path);
    if (!existsSync(full) || deleted.some((gone) => path === gone || path.startsWith(`${gone}/`))) continue;
    const lines = dropLines(readFileSync(full, "utf8"), part.dropLines?.[path] ?? []);
    const words = reword(lines.text, part.replace?.[path] ?? []);
    if (!lines.dropped && !words.replaced) continue;
    changed = true;
    edited.push(path);
    const what = [
      lines.dropped && `${lines.dropped} line${lines.dropped === 1 ? "" : "s"}`,
      words.replaced && `${words.replaced} place${words.replaced === 1 ? "" : "s"} reworded`,
    ];
    console.log(`  cut     ${path} (${what.filter(Boolean).join(", ")})`);
    if (!dryRun) writeFileSync(full, words.text);
  }

  // 5. Packages and scripts only it used.
  const installs = new Set();
  const folders = new Set([...Object.keys(part.packageJson ?? {}), ...Object.keys(part.packageJsonSet ?? {})]);
  for (const folder of folders) {
    const entries = part.packageJson?.[folder] ?? {};
    const file = join(inside(ROOT, folder), "package.json");
    if (!existsSync(file)) continue;
    const manifest = JSON.parse(readFileSync(file, "utf8"));
    let touched = false;
    for (const [section, keys] of Object.entries(entries)) {
      for (const key of keys) {
        if (Array.isArray(manifest[section]) && manifest[section].includes(key)) {
          manifest[section] = manifest[section].filter((entry) => entry !== key);
          touched = true;
          console.log(`  drop    ${join(folder, "package.json")} ${section}: ${key}`);
        } else if (manifest[section] && !Array.isArray(manifest[section]) && key in manifest[section]) {
          delete manifest[section][key];
          touched = true;
          console.log(`  drop    ${join(folder, "package.json")} ${section}.${key}`);
        }
      }
    }
    for (const [section, values] of Object.entries(part.packageJsonSet?.[folder] ?? {})) {
      for (const [key, value] of Object.entries(values)) {
        if (manifest[section]?.[key] !== undefined && manifest[section][key] !== value) {
          manifest[section][key] = value;
          touched = true;
          console.log(`  set     ${join(folder, "package.json")} ${section}.${key}`);
        }
      }
    }
    if (!touched) continue;
    changed = true;
    // apps/mobile keeps its own lockfile; everything else installs from the root.
    installs.add(folder === "apps/mobile" ? "apps/mobile" : ".");
    edited.push(join(folder, "package.json"));
    if (!dryRun) writeFileSync(file, `${JSON.stringify(manifest, null, 2)}\n`);
  }

  // 6. Entries in other JSON files, which cannot carry a marker. A key is dropped from an
  //    object, a value from a list, and an item from a list of objects by its "name".
  for (const [path, sections] of Object.entries(part.json ?? {})) {
    const full = inside(ROOT, path);
    if (!existsSync(full)) continue;
    const data = JSON.parse(readFileSync(full, "utf8"));
    let touched = false;
    for (const [section, keys] of Object.entries(sections)) {
      const value = data[section];
      if (Array.isArray(value)) {
        data[section] = value.filter((item) => !keys.includes(typeof item === "object" && item ? item.name : item));
        touched ||= data[section].length !== value.length;
      } else if (value && typeof value === "object") {
        for (const key of keys) {
          if (key in value) {
            delete value[key];
            touched = true;
          }
        }
      }
    }
    if (!touched) continue;
    changed = true;
    edited.push(path);
    console.log(`  cut     ${path}`);
    if (!dryRun) writeFileSync(full, `${JSON.stringify(data, null, 2)}\n`);
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
  const notes = [...(part.notes ?? [])];
  if (part.regenerate?.includes("db")) {
    run("npm", ["run", "db:generate"]);
    // The local database follows, so the next `npm run dev` does not meet tables the code no longer has.
    if (!migrateLocally()) {
      notes.push(
        "The local database could not be reached (what `npm run db:migrate:local` said is above), so the new migration is not applied to it yet. Run that command before `npm run dev`.",
      );
    }
  }
  if (part.regenerate?.includes("theme")) run("npm", ["run", "theme"]);
  const toFormat = [...new Set(edited)].filter(
    (file) => existsSync(join(ROOT, file)) && /\.(ts|tsx|mjs|js|json|jsonc|css|md|yml|yaml)$/.test(file),
  );
  if (toFormat.length) {
    dropUnusedImports(toFormat);
    run("npx", ["biome", "check", "--write", "--no-errors-on-unmatched", ...toFormat]);
  }
  // DESIGN.md and PRODUCT.md are written from the product config, the brief and the brand,
  // and the check holds them to it. A copy that has no design skill has no such script.
  if (existsSync(join(ROOT, "scripts/design-context.mjs"))) run("node", ["scripts/design-context.mjs"]);

  // What the list did not know about: a sentence someone added since, in a document.
  const traces = sourceFiles()
    .filter(isDocument)
    .flatMap((file) =>
      tracesIn(readFileSync(join(ROOT, file), "utf8"), part.traces ?? []).map(
        ({ line, word }) => `${file}:${line} still says "${word}"`,
      ),
    );

  console.log(`\nRemoved ${name}. Now run: npm run check`);
  for (const note of notes) console.log(`Note: ${note}`);
  if (traces.length) {
    console.log(`Note: the documents still name what was removed. Reword these by hand:\n  ${traces.join("\n  ")}`);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
