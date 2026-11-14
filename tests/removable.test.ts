// `npm run remove` works from a list (scripts/removable.mjs) and from markers in the code.
// These tests keep the two in step with the repository, so a renamed file or a mistyped
// marker is caught here and not on the day someone removes a part.
//
// The list also says what the documents lose with a part (lines, wording) and which words
// must not be left in them. That is held here too, by doing a part's edits to the documents
// in memory: a sentence that still names a removed part fails `npm test`, not a later reader.
//
// The full proof, removing each part on a copy and running the check and the build, is
// scripts/check-removal.mjs (CI runs it).
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(import.meta.dirname, "..");

interface Part {
  what: string;
  paths?: string[];
  write?: Record<string, string>;
  packageJson?: Record<string, Record<string, string[]>>;
  dropLines?: Record<string, string[]>;
  replace?: Record<string, [find: string, replacement: string][]>;
  traces?: string[];
}
// A variable, so TypeScript does not look for types of the plain .mjs files.
const modules = { list: "../scripts/removable.mjs", remove: "../scripts/remove.mjs" };
const { PARTS } = (await import(modules.list)) as { PARTS: Record<string, Part> };
const { cutMarked, dropDangling, dropLines, reword, leadingComment, keepLeadingComment, isDocument, tracesIn } =
  (await import(modules.remove)) as {
    cutMarked(text: string, part: string, file?: string): { text: string; cut: number };
    dropDangling(text: string, file: string, deleted: string[]): { text: string; dropped: number };
    dropLines(text: string, needles: string[]): { text: string; dropped: number };
    reword(text: string, pairs: [string, string][]): { text: string; replaced: number };
    leadingComment(text: string): string;
    keepLeadingComment(before: string, after: string): string;
    isDocument(file: string): boolean;
    tracesIn(text: string, words: string[]): { line: number; word: string }[];
  };

const exists = (file: string) => fs.existsSync(path.join(ROOT, file));
const FILES = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], {
  cwd: ROOT,
  maxBuffer: 64 * 1024 * 1024,
})
  .toString("utf8")
  .split("\0")
  .filter((file) => /\.(ts|tsx|mjs|js|jsonc|md|css|yml|yaml|example)$/.test(file) && exists(file))
  // These two describe the markers, so they contain them.
  .filter((file) => !["scripts/remove.mjs", "scripts/removable.mjs", "tests/removable.test.ts"].includes(file));
const MARKER = /^\s*(?:\/\/|#|\{\/\*|\/\*|<!--)\s*(>>>|<<<)\s*([\w-]+)/;

/** Marker names in use, with the files that use them. */
function markersInUse(): Map<string, string[]> {
  const found = new Map<string, string[]>();
  for (const file of FILES) {
    const text = fs.readFileSync(path.join(ROOT, file), "utf8");
    if (!text.includes(">>>") && !text.includes("<<<")) continue;
    for (const line of text.split("\n")) {
      const name = MARKER.exec(line)?.[2];
      if (name && !found.get(name)?.includes(file)) found.set(name, [...(found.get(name) ?? []), file]);
    }
  }
  return found;
}

/** A part that has been removed leaves none of its own folders and files behind. */
const removed = (part: Part) => (part.paths ?? []).every((file) => !exists(file));
/** The parts still here, by name. */
const PRESENT = Object.entries(PARTS).filter(([, part]) => !removed(part));
const under = (file: string, part: Part) =>
  (part.paths ?? []).some((folder) => file === folder || file.startsWith(`${folder}/`));
/** The files a part's lines and wording are in, each with the texts it must hold. */
const textsOf = (part: Part): [file: string, texts: string[]][] =>
  [...new Set([...Object.keys(part.dropLines ?? {}), ...Object.keys(part.replace ?? {})])].map((file) => [
    file,
    [...(part.dropLines?.[file] ?? []), ...(part.replace?.[file] ?? []).map(([find]) => find)],
  ]);
const read = (file: string) => fs.readFileSync(path.join(ROOT, file), "utf8");

/**
 * `text` (the contents of `file`) as removing `name` leaves it: marked blocks cut, lines
 * dropped, wording replaced. Null when the file goes with the part.
 */
function without(name: string, file: string, text: string): string | null {
  const part = PARTS[name];
  if (!part || under(file, part)) return null;
  const cut = text.includes(`>>> ${name}`) ? cutMarked(text, name, file).text : text;
  return reword(dropLines(cut, part.dropLines?.[file] ?? []).text, part.replace?.[file] ?? []).text;
}

describe("the list of removable parts", () => {
  it("names files and folders that exist", () => {
    const gone = (file: string) =>
      Object.values(PARTS).some(
        (other) => removed(other) && (other.paths ?? []).some((folder) => file.startsWith(`${folder}/`)),
      );
    const missing = Object.entries(PARTS).flatMap(([name, part]) =>
      removed(part)
        ? []
        : (part.paths ?? []).filter((file) => !exists(file) && !gone(file)).map((file) => `${name}: ${file}`),
    );
    expect(missing).toEqual([]);
  });

  it("names package entries that exist", () => {
    const missing = Object.entries(PARTS).flatMap(([name, part]) => {
      if (removed(part)) return [];
      return Object.entries(part.packageJson ?? {}).flatMap(([folder, sections]) => {
        const file = path.join(folder, "package.json");
        if (!exists(file)) return [];
        const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, file), "utf8")) as Record<string, unknown>;
        return Object.entries(sections).flatMap(([section, keys]) =>
          keys
            .filter((key) => {
              const value = manifest[section];
              return Array.isArray(value) ? !value.includes(key) : !(value && key in (value as object));
            })
            .map((key) => `${name}: ${file} ${section}.${key}`),
        );
      });
    });
    expect(missing).toEqual([]);
  });
});

describe("what the list says about documents and comments", () => {
  const DOCUMENTS = FILES.filter(isDocument);

  it("names lines and wording that exist", () => {
    const missing = PRESENT.flatMap(([name, part]) =>
      textsOf(part).flatMap(([file, texts]) => {
        // A file that went with another part takes its lines with it.
        if (!exists(file)) return Object.values(PARTS).some((other) => under(file, other)) ? [] : [`${name}: ${file}`];
        const text = read(file);
        return texts.filter((wanted) => !text.includes(wanted)).map((wanted) => `${name}: ${file}: "${wanted}"`);
      }),
    );
    expect(missing).toEqual([]);
  });

  it("changes something with every replacement", () => {
    const idle = PRESENT.flatMap(([name, part]) =>
      Object.entries(part.replace ?? {}).flatMap(([file, pairs]) =>
        pairs
          .filter(([find, replacement]) => !find || find === replacement)
          .map(([find]) => `${name}: ${file}: "${find}"`),
      ),
    );
    expect(idle).toEqual([]);
  });

  it("still finds each part's lines and wording once any other part is removed", () => {
    const lost = PRESENT.flatMap(([first]) =>
      PRESENT.filter(([name]) => name !== first).flatMap(([name, part]) =>
        textsOf(part).flatMap(([file, texts]) => {
          const text = exists(file) ? without(first, file, read(file)) : null;
          if (text === null) return [];
          return texts
            .filter((wanted) => !text.includes(wanted))
            .map((wanted) => `after ${first}, ${name}: ${file}: "${wanted}"`);
        }),
      ),
    );
    expect(lost).toEqual([]);
  });

  it("covers the documents, and not the history or what was copied in", () => {
    expect(DOCUMENTS).toEqual(expect.arrayContaining(["README.md", "AGENTS.md", "docs/ARCHITECTURE.md"]));
    expect(DOCUMENTS).toEqual(expect.arrayContaining([".claude/README.md", ".claude/rules/modules.md"]));
    expect(DOCUMENTS).toContain(".claude/skills/start/SKILL.md");
    expect(DOCUMENTS.filter((file) => /PLAN|UPGRADING|impeccable|unslop|appllama/.test(file))).toEqual([]);
  });

  it("gives every part words to look for, each of which a document holds today", () => {
    const all = DOCUMENTS.map(read).join("\n");
    const unused = PRESENT.flatMap(([name, part]) => {
      if (!part.traces?.length) return [`${name}: no traces`];
      return part.traces.filter((word) => tracesIn(all, [word]).length === 0).map((word) => `${name}: "${word}"`);
    });
    expect(unused).toEqual([]);
  });

  /** Where the documents still name one of `names` after all of them are removed, in that order. */
  function tracesAfter(names: string[]): string[] {
    return DOCUMENTS.flatMap((file) => {
      let text: string | null = read(file);
      for (const name of names) text = text === null ? null : without(name, file, text);
      if (text === null) return [];
      const words = names.flatMap((name) => PARTS[name]?.traces ?? []);
      return tracesIn(text, words).map(
        ({ line, word }) => `without ${names.join(" and ")}, ${file}:${line} says "${word}"`,
      );
    });
  }

  it("leaves no document naming a part that was removed", () => {
    expect(PRESENT.flatMap(([name]) => tracesAfter([name]))).toEqual([]);
  });

  it("leaves none when two parts are removed, in either order", () => {
    const left = PRESENT.flatMap(([first]) =>
      PRESENT.filter(([second]) => second !== first).flatMap(([second]) => tracesAfter([first, second])),
    );
    expect(left).toEqual([]);
  });
});

describe("removal markers", () => {
  const inUse = markersInUse();

  it("name a part on the list", () => {
    const unknown = [...inUse].filter(([name]) => !(name in PARTS)).map(([name, files]) => `${name} in ${files[0]}`);
    expect(unknown).toEqual([]);
  });

  it("open and close in pairs", () => {
    for (const [name, files] of inUse) {
      for (const file of files) {
        expect(() => cutMarked(fs.readFileSync(path.join(ROOT, file), "utf8"), name, file)).not.toThrow();
      }
    }
  });

  it("are gone once their part is", () => {
    const left = Object.entries(PARTS)
      .filter(([name, part]) => (part.paths ?? []).length > 0 && removed(part) && inUse.has(name))
      .map(([name]) => `${name} in ${inUse.get(name)?.[0]}`);
    expect(left).toEqual([]);
  });
});

describe("cutting a marked block", () => {
  it("takes the block and its markers, in every comment style", () => {
    const text = [
      "a",
      "// >>> x",
      "b",
      "// <<< x",
      "c",
      "  {/* >>> x */}",
      "d",
      "  {/* <<< x */}",
      "# >>> x",
      "e",
      "# <<< x",
      "f",
    ];
    expect(cutMarked(text.join("\n"), "x")).toEqual({ text: "a\nc\nf", cut: 3 });
  });

  it("leaves other parts' blocks alone, including ones whose name starts the same", () => {
    const text = "// >>> ai\na\n// <<< ai\n// >>> ai-extra\nb\n// <<< ai-extra\n";
    expect(cutMarked(text, "ai").text).toBe("// >>> ai-extra\nb\n// <<< ai-extra\n");
  });

  it("refuses a block that is not closed, or closed twice", () => {
    expect(() => cutMarked("// >>> x\na\n", "x", "file.ts")).toThrow("never closed");
    expect(() => cutMarked("a\n// <<< x\n", "x", "file.ts")).toThrow("without");
  });
});

describe("imports of a deleted file", () => {
  const deleted = ["packages/backend/src/modules/ai", "packages/shared/src/schemas/ai.ts"];

  it("are dropped, whatever their form, and nothing else is", () => {
    const text = [
      'import { ask } from "../modules/ai/runner";',
      'import type { Budget } from "../modules/ai/ledger";',
      'import { currentPlan } from "../modules/payments/plans";',
      "export {",
      "  type Thing,",
      "  thing,",
      '} from "../modules/ai/settings";',
      'export * from "../modules/ai";',
      'import "./modules";',
      'import { os } from "./base";',
      "export function keep() {",
      "  return 1;",
      "}",
      "",
    ].join("\n");
    const result = dropDangling(text, "packages/backend/src/api/router.ts", deleted);
    expect(result.dropped).toBe(4);
    expect(result.text).toBe(
      [
        'import { currentPlan } from "../modules/payments/plans";',
        'import "./modules";',
        'import { os } from "./base";',
        "export function keep() {",
        "  return 1;",
        "}",
        "",
      ].join("\n"),
    );
  });

  it("match a deleted file by its path, not by a name that starts the same", () => {
    const text = 'import { a } from "../schemas/ai";\nimport { b } from "../schemas/aircraft";\n';
    const result = dropDangling(text, "packages/shared/src/contract/index.ts", deleted);
    expect(result.text).toBe('import { b } from "../schemas/aircraft";\n');
  });

  it("never reach past a statement to a later import", () => {
    const text = 'export function f() {\n  return 1\n}\nimport { ask } from "../modules/ai/runner";\n';
    expect(dropDangling(text, "packages/backend/src/api/x.ts", deleted).text).toBe(
      "export function f() {\n  return 1\n}\n",
    );
  });
});

describe("dropping lines from a document", () => {
  it("takes every line that holds the text, and no other", () => {
    const text = "# Title\n\n- keeps\n- about the app\n- keeps too\n";
    expect(dropLines(text, ["the app"])).toEqual({ text: "# Title\n\n- keeps\n- keeps too\n", dropped: 1 });
    expect(dropLines(text, ["not there"])).toEqual({ text, dropped: 0 });
  });

  it("leaves one blank line where a paragraph or a section stood between two", () => {
    const text = "One.\n\n## About the app\n\nThe app does this.\n\nTwo.\n";
    expect(dropLines(text, ["About the app", "The app does"]).text).toBe("One.\n\nTwo.\n");
    expect(dropLines("One.\n\nThe app, last.\n", ["The app"]).text).toBe("One.\n");
  });

  it("takes a sentence from inside a paragraph when it sits on its own line", () => {
    const text = "The web is built with one thing.\nThe app is built with another.\nBoth read one config.\n";
    expect(dropLines(text, ["The app is built"]).text).toBe(
      "The web is built with one thing.\nBoth read one config.\n",
    );
  });
});

describe("changing the wording of a sentence", () => {
  it("replaces every occurrence, as plain text", () => {
    const text = "Dispatched: MCP (a.b), sign-in, pages. Again: MCP (a.b), sign-in.";
    expect(reword(text, [["MCP (a.b), sign-in", "sign-in"]])).toEqual({
      text: "Dispatched: sign-in, pages. Again: sign-in.",
      replaced: 2,
    });
    expect(reword(text, [["MCP (aXb)", "$&"]])).toEqual({ text, replaced: 0 });
  });

  it("can take a sentence that runs over two lines", () => {
    const text = "Kept. This one names\nthe part and goes. Kept too.\n";
    expect(reword(text, [[" This one names\nthe part and goes.", ""]]).text).toBe("Kept. Kept too.\n");
  });
});

describe("looking for what still names a removed part", () => {
  it("finds a word whole, in its own case, plural or not, and says on which line", () => {
    const text = "Export the token.\nBuilt with Expo.\nNothing internal is exposed.\nExpo's docs, two Expos.\n";
    expect(tracesIn(text, ["Expo"])).toEqual([
      { line: 2, word: "Expo" },
      { line: 4, word: "Expo" },
    ]);
  });

  it("finds a path or a command wherever it stands, and not a longer name", () => {
    expect(tracesIn("see `apps/mobile/src`, then `/listing`", ["apps/mobile", "/listing"])).toHaveLength(2);
    expect(tracesIn("`npm run check:listings` and (site)", ["/listing", "/site"])).toEqual([]);
    expect(tracesIn("the website, on site, `/site`", ["/site"])).toEqual([{ line: 1, word: "/site" }]);
  });
});

describe("the comment a file opens with", () => {
  const header = "// What this file is for.\n// And why.";

  it("is read from the top, after a shebang or a directive", () => {
    expect(leadingComment(`${header}\nimport a from "a";\n`)).toBe(header);
    expect(leadingComment(`#!/usr/bin/env node\n${header}\nimport a from "a";\n`)).toBe(header);
    expect(leadingComment(`"use client";\n\n${header}\nimport a from "a";\n`)).toBe(header);
    expect(leadingComment('/**\n * In a block.\n */\nimport a from "a";\n')).toBe("/**\n * In a block.\n */");
    expect(leadingComment('import a from "a";\n// Later.\n')).toBe("");
    expect(leadingComment('/* inline */ import a from "a";\n')).toBe("");
  });

  it("is put back when the fix for an unused import took it with the first import", () => {
    const before = `${header}\nimport { gone } from "a";\nimport { kept } from "b";\n\nexport const x = kept;\n`;
    const after = '\nimport { kept } from "b";\n\nexport const x = kept;\n';
    expect(keepLeadingComment(before, after)).toBe(`${header}\nimport { kept } from "b";\n\nexport const x = kept;\n`);
  });

  it("goes back under the directive, and stands apart from code that is not an import", () => {
    const before = `"use client";\n\n${header}\nimport { gone } from "a";\n\nexport const x = 1;\n`;
    const after = '"use client";\n\n\nexport const x = 1;\n';
    expect(keepLeadingComment(before, after)).toBe(`"use client";\n\n${header}\n\nexport const x = 1;\n`);
    expect(keepLeadingComment(`#!/usr/bin/env node\n${header}\nimport a from "a";\n`, "#!/usr/bin/env node\n\n")).toBe(
      `#!/usr/bin/env node\n${header}\n`,
    );
  });

  it("is left alone when it is still there, and a note for a tool about the import is not kept", () => {
    const untouched = `${header}\n\nexport const x = 1;\n`;
    expect(keepLeadingComment(`${header}\n\nimport { gone } from "a";\n\nexport const x = 1;\n`, untouched)).toBe(
      untouched,
    );
    const noted = `${header}\n// biome-ignore lint/style/useImportType: needed at run time\nimport { gone } from "a";\n`;
    expect(keepLeadingComment(noted, "\n")).toBe(`${header}\n`);
    expect(keepLeadingComment('import { gone } from "a";\nexport const x = 1;\n', "export const x = 1;\n")).toBe(
      "export const x = 1;\n",
    );
  });
});

// The whole script on a small repository of its own, with the real formatter and linter: what
// a removal does after its cuts (dropping unused imports, a migration, the design files) is
// where the comment at the top of a file was once lost without any check failing.
describe("a removal, run for real on a small repository", () => {
  const files: Record<string, string> = {
    ".gitignore": "node_modules\n",
    "package.json": `${JSON.stringify({
      name: "fixture",
      private: true,
      type: "module",
      scripts: {
        "db:generate": "node steps.mjs generated",
        "db:migrate:local": "node steps.mjs migrated fail",
      },
    })}\n`,
    // Each step notes that it ran and what ran before it; the local database cannot be reached.
    "steps.mjs": `import { appendFileSync } from "node:fs";
appendFileSync("steps.txt", \`\${process.argv[2]}\\n\`);
if (process.argv[3] === "fail") process.exit(1);
`,
    "scripts/design-context.mjs":
      'import { appendFileSync } from "node:fs";\nappendFileSync("steps.txt", "design\\n");\n',
    "scripts/removable.mjs": `export const DOCUMENTS = { include: [/^README\\.md$/], exclude: [] };
export const PARTS = {
  extra: {
    what: "the extra part",
    paths: ["src/extra.ts"],
    dropLines: { "README.md": ["The extra part does"] },
    replace: { "README.md": [["a core and an extra part", "a core"]] },
    regenerate: ["db"],
    traces: ["extra"],
  },
};
`,
    "README.md":
      "# Fixture\n\nIt has a core and an extra part.\nThe extra part does more.\nThe core stays.\n\nAsk for extra help.\n",
    "src/lib.ts": "// Shared helpers.\nexport const helper = 1;\nexport const kept = 2;\n",
    "src/extra.ts": "// The extra part.\nexport const extra = 3;\n",
    "src/main.ts": `// What this file is for, in a line.
// And a second line.
import { helper } from "./lib";
import { kept } from "./lib";
import { extra } from "./extra";

export const values = [
  // >>> extra
  helper,
  extra,
  // <<< extra
  kept,
];
`,
    "src/client.ts": `"use client";

// What the client file is for.
import { helper } from "./lib";

// >>> extra
export const more = helper;
// <<< extra
export const one = 1;
`,
  };

  it("keeps each file's opening comment, rewords the documents, and goes on when the local database cannot be reached", () => {
    const repo = fs.mkdtempSync(path.join(os.tmpdir(), "removal-fixture-"));
    try {
      for (const [file, text] of Object.entries(files)) {
        fs.mkdirSync(path.dirname(path.join(repo, file)), { recursive: true });
        fs.writeFileSync(path.join(repo, file), text);
      }
      for (const file of ["scripts/remove.mjs", "biome.json"])
        fs.copyFileSync(path.join(ROOT, file), path.join(repo, file));
      // The tools the script runs (Biome) come from this repository's own install.
      fs.symlinkSync(path.join(ROOT, "node_modules"), path.join(repo, "node_modules"), "junction");
      execFileSync("git", ["init", "-q"], { cwd: repo });
      // "pipe": what the tools it runs print stays out of this test's own output.
      const said = execFileSync("node", ["scripts/remove.mjs", "extra"], {
        cwd: repo,
        encoding: "utf8",
        stdio: "pipe",
      });
      const now = (file: string) => fs.readFileSync(path.join(repo, file), "utf8");

      expect(fs.existsSync(path.join(repo, "src/extra.ts"))).toBe(false);
      expect(now("src/main.ts")).toBe(
        '// What this file is for, in a line.\n// And a second line.\nimport { kept } from "./lib";\n\nexport const values = [kept];\n',
      );
      expect(now("src/client.ts")).toBe('"use client";\n\n// What the client file is for.\n\nexport const one = 1;\n');
      expect(now("README.md")).toBe("# Fixture\n\nIt has a core.\nThe core stays.\n\nAsk for extra help.\n");
      // The migration is generated, then applied locally; that failing stops nothing, and is said.
      expect(now("steps.txt")).toBe("generated\nmigrated\ndesign\n");
      expect(said).toContain("Removed extra.");
      expect(said).toContain("The local database could not be reached");
      expect(said).toContain("npm run db:migrate:local");
      // A sentence the list does not know about is pointed out, with its line.
      expect(said).toContain('README.md:6 still says "extra"');
    } finally {
      fs.rmSync(repo, { recursive: true, force: true });
    }
  }, 120_000);
});

describe("entries the list drops from JSON files", () => {
  const { PARTS: parts } = { PARTS } as {
    PARTS: Record<string, Part & { json?: Record<string, Record<string, string[]>> }>;
  };

  it("each name something that is in the file, at the key (or the path into the file) given", () => {
    for (const [name, part] of Object.entries(parts)) {
      for (const [file, sections] of Object.entries(part.json ?? {})) {
        const data = JSON.parse(fs.readFileSync(path.join(ROOT, file), "utf8"));
        for (const [section, entries] of Object.entries(sections)) {
          const value = section.split(".").reduce((at, step) => at?.[step], data);
          expect(value, `${name}: ${file} has no "${section}"`).toBeTruthy();
          const held = Array.isArray(value)
            ? value.map((item: unknown) => (typeof item === "object" && item ? (item as { name: string }).name : item))
            : Object.keys(value);
          for (const entry of entries) expect(held, `${name}: ${file} ${section}`).toContain(entry);
        }
      }
    }
  });
});
