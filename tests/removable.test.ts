// `npm run remove` works from a list (scripts/removable.mjs) and from markers in the code.
// These tests keep the two in step with the repository, so a renamed file or a mistyped
// marker is caught here and not on the day someone removes a part.
//
// The full proof, removing each part on a copy and running the check and the build, is
// scripts/check-removal.mjs (CI runs it).
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(import.meta.dirname, "..");

interface Part {
  what: string;
  paths?: string[];
  write?: Record<string, string>;
  packageJson?: Record<string, Record<string, string[]>>;
}
// A variable, so TypeScript does not look for types of the plain .mjs files.
const modules = { list: "../scripts/removable.mjs", remove: "../scripts/remove.mjs" };
const { PARTS } = (await import(modules.list)) as { PARTS: Record<string, Part> };
const { cutMarked } = (await import(modules.remove)) as {
  cutMarked(text: string, part: string, file?: string): { text: string; cut: number };
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
