// The feature scaffold (scripts/new-feature.mjs) and the script that replaces its first
// migration (scripts/db-redo.mjs). The scaffold is held to what it once got wrong: a plural
// taken for a name, a rule that surfaced as a server error, a delete that did not ask. The
// redo is held to its one promise: it throws away what is not committed, and nothing else.
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(import.meta.dirname, "..");
// Variables, so TypeScript does not look for types of the plain .mjs files.
const scripts = { scaffold: "../scripts/new-feature.mjs", redo: "../scripts/db-redo.mjs" };
interface Names {
  single: string;
  plural: string;
  Single: string;
  Plural: string;
  PLURAL: string;
}
const scaffold = (await import(scripts.scaffold)) as {
  names(single: string, plural?: string): Names;
  files(feature: Names): Record<string, string>;
  insertions(feature: Names): [file: string, find: string, text: string][];
  nextSteps(feature: Names): string[];
};
const redo = (await import(scripts.redo)) as {
  MIGRATIONS: string;
  LOCAL_DATABASE: string;
  uncommitted(status: string): { remove: string[]; restore: string[]; refused: string[]; left: string[] };
};

describe("the name of a new feature", () => {
  it("is given in the singular, and the plural adds an s", () => {
    expect(scaffold.names("note")).toEqual({
      single: "note",
      plural: "notes",
      Single: "Note",
      Plural: "Notes",
      PLURAL: "NOTES",
    });
  });

  it("is refused when it is a plural already, with the way out", () => {
    expect(() => scaffold.names("renewals")).toThrow('its plural would be "renewalss"');
    expect(() => scaffold.names("renewals")).toThrow("in the singular");
    expect(() => scaffold.names("status")).toThrow("--plural");
  });

  it("may end in s when the plural is said", () => {
    expect(scaffold.names("status", "statuses")).toMatchObject({ plural: "statuses", Plural: "Statuses" });
    expect(scaffold.names("category", "categories")).toMatchObject({ single: "category", PLURAL: "CATEGORIES" });
  });

  it("is one lowercase word, and not its own plural", () => {
    expect(() => scaffold.names("Note")).toThrow("one lowercase word");
    expect(() => scaffold.names("to-do")).toThrow("one lowercase word");
    expect(() => scaffold.names("note", "My Notes")).toThrow("one lowercase word");
    expect(() => scaffold.names("sheep", "sheep")).toThrow("must differ");
  });
});

describe("what the scaffold writes", () => {
  const feature = scaffold.names("note");
  const written = scaffold.files(feature);
  const added = (file: string) =>
    scaffold
      .insertions(feature)
      .filter(([target]) => target === file)
      .map(([, , text]) => text)
      .join("\n");

  it("turns a rule's refusal into the API's error, not a server error", () => {
    expect(added("packages/backend/src/api/router.ts")).toContain("userErrors(() => createNote(");
  });

  it("caps how many a person keeps, in the statement that inserts", () => {
    const logic = written["packages/backend/src/features/notes.ts"] ?? "";
    // One statement: the insert takes its row from a select that the count can leave empty.
    expect(logic).toMatch(/insert into \$\{table\}[^`]*select[^`]*where \$\{kept\} < \$\{MOST_NOTES\}/);
    expect(logic).toContain('new UserError(409, "notes_full"');
    expect(written["apps/web/tests/notes.workers.test.ts"]).toContain("toEqual([200, 409])");
  });

  it("asks before it deletes, and writes dates the same on the server and in the browser", () => {
    const rows = written["apps/web/app/(app)/app/notes/NoteRows.tsx"] ?? "";
    expect(rows).toContain("<AlertDialog");
    expect(rows).not.toMatch(/clickAction=\{\(\) => remove\(/);
    expect(rows).toContain('new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" })');
    expect(rows).not.toMatch(/toLocale(Date|Time)?String\(/);
    // A section under the page title is sized as a third-level heading (.claude/rules/web.md).
    expect(rows).toContain("<Heading level={3} accessibilityLevel={2}>");
    expect(rows).not.toMatch(/<Heading level=\{2\}/);
  });

  it("shows the design gate the page with a row, added and deleted through the page", () => {
    const check = added("tests/e2e/design.spec.ts");
    expect(check.match(/await expectClean\(/g)).toHaveLength(2);
    expect(check).toContain('getByLabel("New note").fill(');
    expect(check).toContain('getByRole("alertdialog")');
    expect(check).toContain("toBeFocused()");
  });

  it("says what comes next in the order that works: shape, one migration, check", () => {
    const next = scaffold.nextSteps(feature).join("\n");
    expect(next).not.toContain("db:migrate:local");
    const at = (text: string) => next.indexOf(text);
    expect(at("the table first")).toBeGreaterThan(-1);
    expect(at("npm run db:redo")).toBeGreaterThan(at("the table first"));
    expect(at("npm run check")).toBeGreaterThan(at("npm run db:redo"));
  });
});

describe("which files a redo throws away, from git's status", () => {
  const at = (file: string) => `${redo.MIGRATIONS}/${file}`;
  /** `git status --porcelain=v1 -z`: two letters, a space and the path, each entry ended by a NUL. */
  const status = (...entries: [code: string, file: string][]) =>
    entries.map(([code, file]) => `${code} ${file}\0`).join("");

  it("the files of a migration that is not committed go, and the journal is put back", () => {
    const plan = redo.uncommitted(
      status(
        [" M", at("meta/_journal.json")],
        ["??", at("0005_curly_charles_xavier.sql")],
        ["??", at("0006_second_try.sql")],
        ["??", at("meta/0005_snapshot.json")],
        ["??", at("meta/0006_snapshot.json")],
      ),
    );
    expect(plan).toEqual({
      remove: [
        at("0005_curly_charles_xavier.sql"),
        at("0006_second_try.sql"),
        at("meta/0005_snapshot.json"),
        at("meta/0006_snapshot.json"),
      ],
      restore: [at("meta/_journal.json")],
      refused: [],
      left: [],
    });
  });

  it("a file added to the index is not committed either", () => {
    const plan = redo.uncommitted(
      status(["A ", at("0005_new.sql")], ["AM", at("meta/0005_snapshot.json")], ["M ", at("meta/_journal.json")]),
    );
    expect(plan.remove).toEqual([at("0005_new.sql"), at("meta/0005_snapshot.json")]);
    expect(plan.restore).toEqual([at("meta/_journal.json")]);
  });

  it("a committed migration is never touched: one that was edited or deleted is refused", () => {
    const plan = redo.uncommitted(
      status(
        [" M", at("0001_brief_karen_page.sql")],
        [" D", at("meta/0003_snapshot.json")],
        ["??", at("0005_new.sql")],
      ),
    );
    expect(plan.refused).toEqual([at("0001_brief_karen_page.sql"), at("meta/0003_snapshot.json")]);
    expect(plan.remove).toEqual([at("0005_new.sql")]);
  });

  it("nothing uncommitted means nothing to do", () => {
    expect(redo.uncommitted("")).toEqual({ remove: [], restore: [], refused: [], left: [] });
  });

  it("leaves what drizzle-kit did not write, and everything outside the folder", () => {
    const plan = redo.uncommitted(
      status(
        ["??", at("notes.txt")],
        ["??", at("meta/0005_snapshot.json.orig")],
        [" M", "packages/backend/src/db/schema/notes.ts"],
        ["??", "packages/backend/migrations-old/0001_x.sql"],
      ),
    );
    expect(plan).toEqual({
      remove: [],
      restore: [],
      refused: [],
      left: [at("notes.txt"), at("meta/0005_snapshot.json.orig")],
    });
  });
});

// The whole script on a small repository of its own. drizzle-kit and Wrangler are stood in for
// by a script that does what they do to the files: write the next migration, apply them.
describe("a redo, run for real on a small repository", () => {
  const journal = (...tags: string[]) => `${JSON.stringify({ entries: tags.map((tag, idx) => ({ idx, tag })) })}\n`;
  const fixture: Record<string, string> = {
    "package.json": `${JSON.stringify({
      name: "fixture",
      private: true,
      type: "module",
      scripts: { "db:generate": "node steps.mjs generate", "db:migrate:local": "node steps.mjs migrate" },
    })}\n`,
    "steps.mjs": `import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
const dir = "${redo.MIGRATIONS}";
if (process.argv[2] === "generate") {
  // As drizzle-kit does with a question and no terminal to ask it at: it says so, writes
  // nothing, and still exits with 0.
  if (process.env.FIXTURE_ASKS) {
    console.error("Error: Interactive prompts require a TTY terminal");
    process.exit(0);
  }
  if (process.env.FIXTURE_BREAKS) process.exit(1);
  if (process.env.FIXTURE_SAME) {
    console.log("No schema changes, nothing to migrate");
    process.exit(0);
  }
  const journal = JSON.parse(readFileSync(dir + "/meta/_journal.json", "utf8"));
  const idx = journal.entries.length;
  const tag = String(idx).padStart(4, "0") + "_fresh";
  journal.entries.push({ idx, tag });
  writeFileSync(dir + "/" + tag + ".sql", "create table fresh (id text);\\n");
  writeFileSync(dir + "/meta/" + String(idx).padStart(4, "0") + "_snapshot.json", "{}\\n");
  writeFileSync(dir + "/meta/_journal.json", JSON.stringify(journal) + "\\n");
} else {
  mkdirSync("${redo.LOCAL_DATABASE}", { recursive: true });
  const applied = readdirSync(dir).filter((file) => file.endsWith(".sql")).sort();
  writeFileSync("${redo.LOCAL_DATABASE}/applied.txt", applied.join(",") + "\\n");
}
`,
    [`${redo.MIGRATIONS}/0000_first.sql`]: "create table first (id text);\n",
    [`${redo.MIGRATIONS}/meta/0000_snapshot.json`]: "{}\n",
    [`${redo.MIGRATIONS}/meta/_journal.json`]: journal("0000_first"),
  };

  function repository() {
    const repo = fs.mkdtempSync(path.join(os.tmpdir(), "redo-fixture-"));
    const write = (file: string, text: string) => {
      fs.mkdirSync(path.dirname(path.join(repo, file)), { recursive: true });
      fs.writeFileSync(path.join(repo, file), text);
    };
    for (const [file, text] of Object.entries(fixture)) write(file, text);
    write("scripts/db-redo.mjs", fs.readFileSync(path.join(ROOT, "scripts/db-redo.mjs"), "utf8"));
    write(".gitignore", ".wrangler/\n");
    const git = (...args: string[]) => execFileSync("git", args, { cwd: repo, encoding: "utf8", stdio: "pipe" });
    git("init", "-q");
    const commit = () => {
      git("add", "-A");
      git(
        "-c",
        "user.name=test",
        "-c",
        "user.email=test@example.com",
        "-c",
        "commit.gpgsign=false",
        "commit",
        "-qm",
        "x",
      );
    };
    const run = (env: Record<string, string> = {}) => {
      const result = spawnSync("node", ["scripts/db-redo.mjs"], {
        cwd: repo,
        encoding: "utf8",
        env: { ...process.env, ...env },
      });
      return { code: result.status, said: result.stdout + result.stderr };
    };
    const now = (file: string) => fs.readFileSync(path.join(repo, file), "utf8");
    const sql = () => fs.readdirSync(path.join(repo, redo.MIGRATIONS)).filter((file) => file.endsWith(".sql"));
    return { repo, write, git, commit, run, now, sql };
  }

  /** Two tries at one table, as a session without a terminal once left them, and a local database that has the first. */
  function twoTries(write: (file: string, text: string) => void) {
    write(`${redo.MIGRATIONS}/0001_try.sql`, "create table notes (title text);\n");
    write(`${redo.MIGRATIONS}/meta/0001_snapshot.json`, "{}\n");
    write(`${redo.MIGRATIONS}/0002_again.sql`, "alter table notes rename column title to name;\n");
    write(`${redo.MIGRATIONS}/meta/0002_snapshot.json`, "{}\n");
    write(`${redo.MIGRATIONS}/meta/_journal.json`, journal("0000_first", "0001_try", "0002_again"));
    write(`${redo.LOCAL_DATABASE}/data.sqlite`, "rows made locally\n");
  }

  it("changes nothing when nothing is uncommitted, and needs a commit to compare with", () => {
    const { repo, commit, run, sql, write, now } = repository();
    try {
      // No commit yet: every migration would look new.
      const early = run();
      expect(early.code).toBe(1);
      expect(early.said).toContain("nothing committed yet");
      expect(sql()).toEqual(["0000_first.sql"]);

      commit();
      write(`${redo.LOCAL_DATABASE}/data.sqlite`, "rows made locally\n");
      const clean = run();
      expect(clean.code).toBe(0);
      expect(clean.said).toContain("nothing was changed");
      expect(sql()).toEqual(["0000_first.sql"]);
      expect(now(`${redo.LOCAL_DATABASE}/data.sqlite`)).toBe("rows made locally\n");
    } finally {
      fs.rmSync(repo, { recursive: true, force: true });
    }
  }, 60_000);

  it("replaces the uncommitted migrations with one, and rebuilds the local database", () => {
    const { repo, commit, run, sql, write, now, git } = repository();
    try {
      commit();
      twoTries(write);
      // Staged or not, it is not committed.
      git("add", `${redo.MIGRATIONS}/0001_try.sql`);
      const done = run();
      expect(done.said).toContain(`discarded  ${redo.MIGRATIONS}/0001_try.sql`);
      expect(done.code).toBe(0);
      expect(sql()).toEqual(["0000_first.sql", "0001_fresh.sql"]);
      expect(now(`${redo.MIGRATIONS}/0000_first.sql`)).toBe("create table first (id text);\n");
      expect(now(`${redo.MIGRATIONS}/meta/_journal.json`)).toBe(journal("0000_first", "0001_fresh"));
      expect(fs.readdirSync(path.join(repo, redo.MIGRATIONS, "meta")).sort()).toEqual([
        "0000_snapshot.json",
        "0001_snapshot.json",
        "_journal.json",
      ]);
      // The local database is new: what was in it is gone, and the migrations are applied.
      expect(fs.existsSync(path.join(repo, redo.LOCAL_DATABASE, "data.sqlite"))).toBe(false);
      expect(now(`${redo.LOCAL_DATABASE}/applied.txt`)).toBe("0000_first.sql,0001_fresh.sql\n");
      expect(done.said).toContain("Local data was reset");
      expect(done.said).toContain(`${redo.MIGRATIONS}/0001_fresh.sql`);
      // Nothing of the try is left in the index.
      expect(git("status", "--porcelain", "--", redo.MIGRATIONS)).not.toContain("0001_try");
    } finally {
      fs.rmSync(repo, { recursive: true, force: true });
    }
  }, 60_000);

  it("puts everything back when the migration cannot be written without an answer", () => {
    const { repo, commit, run, sql, write, now } = repository();
    try {
      commit();
      twoTries(write);
      // drizzle-kit exits with 0 here, so the script has to look at what was written.
      for (const how of ["FIXTURE_ASKS", "FIXTURE_BREAKS"]) {
        const asked = run({ [how]: "1" });
        expect(asked.code).toBe(1);
        expect(asked.said).toContain("back as they were");
        expect(asked.said).toContain("terminal");
        expect(asked.said).toContain("two steps");
        expect(sql()).toEqual(["0000_first.sql", "0001_try.sql", "0002_again.sql"]);
        expect(now(`${redo.MIGRATIONS}/meta/_journal.json`)).toBe(journal("0000_first", "0001_try", "0002_again"));
        expect(now(`${redo.LOCAL_DATABASE}/data.sqlite`)).toBe("rows made locally\n");
      }
    } finally {
      fs.rmSync(repo, { recursive: true, force: true });
    }
  }, 60_000);

  it("leaves no migration when the schema is back to what is committed", () => {
    const { repo, commit, run, sql, write, now } = repository();
    try {
      commit();
      twoTries(write);
      const done = run({ FIXTURE_SAME: "1" });
      expect(done.code).toBe(0);
      expect(done.said).toContain("no migration is needed");
      expect(sql()).toEqual(["0000_first.sql"]);
      expect(now(`${redo.MIGRATIONS}/meta/_journal.json`)).toBe(journal("0000_first"));
      // What was thrown away may have been applied, so the local database is rebuilt all the same.
      expect(now(`${redo.LOCAL_DATABASE}/applied.txt`)).toBe("0000_first.sql\n");
      expect(done.said).toContain("Local data was reset");
    } finally {
      fs.rmSync(repo, { recursive: true, force: true });
    }
  }, 60_000);

  it("stops before touching anything when a committed migration was edited", () => {
    const { repo, commit, run, sql, write, now } = repository();
    try {
      commit();
      twoTries(write);
      write(`${redo.MIGRATIONS}/0000_first.sql`, "create table first (id text, more text);\n");
      const refused = run();
      expect(refused.code).toBe(1);
      expect(refused.said).toContain(`${redo.MIGRATIONS}/0000_first.sql`);
      expect(refused.said).toContain("never edited or deleted");
      expect(sql()).toEqual(["0000_first.sql", "0001_try.sql", "0002_again.sql"]);
      expect(now(`${redo.MIGRATIONS}/0000_first.sql`)).toContain("more text");
    } finally {
      fs.rmSync(repo, { recursive: true, force: true });
    }
  }, 60_000);
});
