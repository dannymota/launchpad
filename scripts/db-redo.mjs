#!/usr/bin/env node
// Replaces the migrations that are not committed yet with one, generated from the schema as
// it is now:
//
//   npm run db:redo
//
// A new table goes through several shapes before it is right. drizzle-kit compares each with
// the migration before it and asks, per column, "created or renamed?". It asks at a terminal,
// and a session without one cannot answer. Until a migration is committed nothing depends on
// it, so this script throws it away (the new .sql files, and what drizzle-kit changed under
// migrations/meta) and generates again from the last committed state. From there a new table
// is only a new table, and nothing is asked.
//
// The migration thrown away may have been applied to the local database, so that is rebuilt
// from the migrations afterwards. Its data is reset, and the script says so.
//
// A committed migration is never touched: it may have run on staging or in production. With
// nothing uncommitted the script changes nothing. When drizzle-kit still has a question (a
// column of a committed table was renamed), a person at a terminal is asked it; where there
// is no terminal, everything is put back as it was.
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const MIGRATIONS = "packages/backend/migrations";
/** Where Wrangler keeps the local database (`npm run dev`, `npm run db:migrate:local`). */
export const LOCAL_DATABASE = "apps/web/.wrangler/state/v3/d1";
/** What drizzle-kit keeps the order of the migrations in. It is committed, and changes with every new one. */
const JOURNAL = `${MIGRATIONS}/meta/_journal.json`;
/** The files drizzle-kit writes for one migration: its SQL, and the schema as it was then. */
const WRITTEN = /^(\d{4}_[\w-]+\.sql|meta\/\d{4}_snapshot\.json)$/;

/**
 * What to do with each uncommitted change under the migrations folder, from the output of
 * `git status --porcelain=v1 -z --no-renames --untracked-files=all -- <the folder>` (paths
 * relative to the repository).
 *
 *   remove    files of a migration that is not committed: deleted
 *   restore   the journal, when it changed: put back as committed
 *   refused   committed migrations that were edited or deleted by hand: never touched
 *   left      other files someone put in the folder: not drizzle-kit's, so not this script's
 */
export function uncommitted(status) {
  const plan = { remove: [], restore: [], refused: [], left: [] };
  for (const entry of status.split("\0")) {
    if (entry.length < 4) continue;
    const code = entry.slice(0, 2);
    const file = entry.slice(3);
    if (!file.startsWith(`${MIGRATIONS}/`)) continue;
    // Untracked, or added to the index and never committed: the last commit does not have it.
    const isNew = code === "??" || code[0] === "A";
    if (file === JOURNAL) (isNew ? plan.remove : plan.restore).push(file);
    else if (!isNew) plan.refused.push(file);
    else if (WRITTEN.test(file.slice(MIGRATIONS.length + 1))) plan.remove.push(file);
    else plan.left.push(file);
  }
  return plan;
}

/** The SQL files among `files`, by name. */
const sqlFiles = (files) =>
  files
    .filter((file) => file.endsWith(".sql"))
    .map((file) => file.slice(MIGRATIONS.length + 1))
    .sort();

const git = (...args) => execFileSync("git", args, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });

/** The uncommitted changes under the migrations folder, with paths relative to this repository. */
function changes() {
  // Git names paths from the top of its repository, which may be a folder above this one.
  const above = git("rev-parse", "--show-prefix").trim();
  const status = git("status", "--porcelain=v1", "-z", "--no-renames", "--untracked-files=all", "--", MIGRATIONS);
  return uncommitted(
    status
      .split("\0")
      .map((entry) => (entry.slice(3).startsWith(above) ? entry.slice(0, 3) + entry.slice(3 + above.length) : entry))
      .join("\0"),
  );
}

/**
 * Runs drizzle-kit and returns what it printed. It exits with 0 even when it could not ask its
 * question and wrote nothing, so the caller looks at what was written, not at `ok` alone. At
 * a terminal nothing is captured: drizzle-kit only asks when both its input and its output
 * are one.
 */
function generate({ atTerminal = false } = {}) {
  const run = spawnSync("npm", ["run", "db:generate"], {
    cwd: ROOT,
    encoding: "utf8",
    stdio: atTerminal ? "inherit" : ["ignore", "pipe", "pipe"],
  });
  return { ok: run.status === 0, said: `${run.stdout ?? ""}${run.stderr ?? ""}` };
}

function main() {
  try {
    git("rev-parse", "--verify", "--quiet", "HEAD");
  } catch {
    throw new Error(
      "Git has no commit here to compare with (no repository, or nothing committed yet), so there is no telling a new migration from one that is in use. Commit first; `npm run db:redo` then replaces what comes after.",
    );
  }
  const plan = changes();
  if (plan.refused.length) {
    throw new Error(
      `A committed migration was changed by hand, and nothing was touched:\n  ${plan.refused.join("\n  ")}\nPut it back (git checkout HEAD -- <file>). A committed migration is never edited or deleted; change the schema and generate a new one.`,
    );
  }
  const discarded = [...plan.remove, ...plan.restore];
  if (discarded.length === 0) {
    console.log("No migration here is uncommitted, so nothing was changed.");
    console.log("For a schema change that has no migration yet: npm run db:generate");
    return;
  }

  // 1. Throw away what is not committed. It is kept in memory until the new migration exists.
  const kept = new Map(
    discarded.filter((file) => existsSync(join(ROOT, file))).map((file) => [file, readFileSync(join(ROOT, file))]),
  );
  const staged = git("diff", "--cached", "--name-only", "--no-renames", "-z", "--relative", "--", MIGRATIONS)
    .split("\0")
    .filter(Boolean);
  const discard = (files) => {
    if (files.length) git("rm", "--cached", "--quiet", "--ignore-unmatch", "--", ...files);
    for (const file of files) rmSync(join(ROOT, file), { force: true });
  };
  discard(plan.remove);
  if (plan.restore.length) git("checkout", "--quiet", "HEAD", "--", ...plan.restore);
  for (const file of sqlFiles(plan.remove)) console.log(`  discarded  ${MIGRATIONS}/${file}`);

  // 2. One migration, from the last committed state to the schema as it is now.
  console.log("  $ npm run db:generate");
  let run = generate();
  let written = sqlFiles(changes().remove);
  const nothingToWrite = () => run.ok && written.length === 0 && /nothing to migrate/i.test(run.said);
  if (run.ok && written.length === 0 && !nothingToWrite() && process.stdin.isTTY && process.stdout.isTTY) {
    // It wrote nothing because it has a question, and here is someone to answer it.
    console.log("drizzle-kit has a question about a table that is already committed. Answer it here:");
    run = generate({ atTerminal: true });
    written = sqlFiles(changes().remove);
  } else {
    process.stdout.write(run.said);
  }
  if (!run.ok || (written.length === 0 && !nothingToWrite())) {
    // Back to how it was: whatever a failed run left, out; what was thrown away, in again.
    const after = changes();
    discard(after.remove);
    if (after.restore.length) git("checkout", "--quiet", "HEAD", "--", ...after.restore);
    for (const [file, content] of kept) {
      mkdirSync(dirname(join(ROOT, file)), { recursive: true });
      writeFileSync(join(ROOT, file), content);
    }
    const again = staged.filter((file) => kept.has(file));
    if (again.length) git("add", "--", ...again);
    throw new Error(
      "drizzle-kit wrote no migration (what it said is above), so the migrations are back as they were.\nIf it wanted to ask a question (created or renamed?), the change touches a table that is already committed, and only a person at a terminal can answer: run `npm run db:redo` in one, or make the change in two steps that ask nothing (add the new column and generate, then drop the old one and generate).",
    );
  }
  for (const file of written) console.log(`  generated  ${MIGRATIONS}/${file}`);
  if (written.length === 0) console.log("  The schema is what the committed migrations make: no migration is needed.");

  // 3. The local database may hold what was thrown away. It starts again from the migrations.
  const hadData = existsSync(join(ROOT, LOCAL_DATABASE));
  rmSync(join(ROOT, LOCAL_DATABASE), { recursive: true, force: true });
  console.log("  $ npm run db:migrate:local");
  try {
    // CI=1: wrangler applies without asking, as it does at the start of a session.
    execFileSync("npm", ["run", "db:migrate:local"], { cwd: ROOT, stdio: "inherit", env: { ...process.env, CI: "1" } });
  } catch {
    throw new Error(
      "The migration is in place, but the local database could not be rebuilt (what `npm run db:migrate:local` said is above). It is empty now: run that command before `npm run dev`.",
    );
  }
  console.log(
    written.length === 1
      ? `\nOne new migration replaces what was not committed: ${MIGRATIONS}/${written[0]}`
      : written.length === 0
        ? "\nWhat was not committed is gone, and no migration takes its place: the schema needs none."
        : `\nNew migrations: ${written.join(", ")}.`,
  );
  console.log(
    hadData
      ? "Local data was reset: the local database was rebuilt from the migrations, so the accounts and everything added on this machine are gone. Sign in again, and restart `npm run dev` if it is running."
      : "The local database was built from the migrations.",
  );
  console.log("Next: npm run check. Commit the migration together with the schema change it belongs to.");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
