// The files the Impeccable design skill reads (PRODUCT.md, DESIGN.md) are written from the
// brief and the brand by scripts/design-context.mjs. These hold the mapping, the files on
// disk, and the pin between the skill's text and the engine npm installs.
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(import.meta.dirname, "..");
// A variable, so TypeScript does not look for types of the plain .mjs file.
const file = "../scripts/design-context.mjs";
// biome-ignore lint/suspicious/noExplicitAny: the script is plain JavaScript.
const context = (await import(file)) as any;

const product = { name: "Acme Notes", tagline: "Notes that find themselves." };
const brief = `# Acme Notes

## What it is

A notebook that files each note by itself.

## Who it is for

Researchers who collect more than they can sort.

## The main thing people do

Paste a note and find it again by what it was about.

## What it is not

A team wiki.
No shared folders.

## Voice

Dry, exact, a little funny.

## Open questions

None.
`;

describe("PRODUCT.md from the brief", () => {
  const web = context.productMd({ product, brief, platform: "web" }) as string;

  it("carries the brief's facts under the headings Impeccable reads", () => {
    expect(web).toContain("<!-- impeccable:product-schema 1 -->");
    expect(web).toMatch(/## Platform\n\nweb\n/);
    expect(web).toMatch(/## Users\n\nResearchers who collect more than they can sort\./);
    expect(web).toMatch(/## Product Purpose\n\nA notebook that files each note by itself\.\n\nPaste a note/);
    expect(web).toContain("- What it is not: A team wiki. No shared folders.");
    expect(web).toContain('- Name: Acme Notes. Tagline: "Notes that find themselves."');
    expect(web).toContain("- Voice: Dry, exact, a little funny.");
  });

  it("says what must not be invented when the brief holds no proof, and uses the proof when it does", () => {
    expect(web).toMatch(/## Evidence on Hand\n\nNothing is on record/);
    const proven = context.productMd({
      product,
      brief: `${brief}\n## Proof\n\n412 people on the waitlist.\n`,
      platform: "web",
    });
    expect(proven).toMatch(/## Evidence on Hand\n\n412 people on the waitlist\./);
  });

  it("tells the app to follow each phone, and the website to stay inside the component library", () => {
    const app = context.productMd({ product, brief, platform: "adaptive" }) as string;
    expect(app).toMatch(/## Platform\n\nadaptive\n/);
    expect(app).toContain("apps/mobile/src/platform");
    expect(app).not.toContain("Astryx components");
    expect(web).toContain("built only from Astryx components");
  });
});

describe("the files on disk", () => {
  it("are what the script would write now", async () => {
    const files = (await context.contextFiles()) as Record<string, string | null>;
    expect(files["DESIGN.md"]).toBeTruthy();
    for (const [name, text] of Object.entries(files)) {
      // No brief yet means no PRODUCT.md to hold to anything.
      if (text === null) continue;
      const onDisk = fs.existsSync(path.join(ROOT, name)) ? fs.readFileSync(path.join(ROOT, name), "utf8") : "";
      expect(onDisk, `${name}: run \`npm run design:context\``).toBe(text);
    }
  });

  it("DESIGN.md has the brand's values in both colour schemes and the sections in their fixed order", () => {
    const design = fs.readFileSync(path.join(ROOT, "DESIGN.md"), "utf8");
    const frontmatter = design.split("\n---\n")[0];
    expect(frontmatter).toMatch(/^ {2}accent: "#[0-9a-f]{6}"$/m);
    expect(frontmatter).toMatch(/^ {2}accent-dark: "#[0-9a-f]{6}"$/m);
    expect(frontmatter).toMatch(/^ {2}body:\n {4}fontFamily: /m);
    expect([...design.matchAll(/^## (.+)$/gm)].map((match) => match[1])).toEqual([
      "Overview",
      "Colors",
      "Typography",
      "Layout",
      "Elevation & Depth",
      "Shapes",
      "Components",
      "Do's and Don'ts",
    ]);
  });
});

describe("the vendored skill and the engine npm installs", () => {
  const read = (name: string) => fs.readFileSync(path.join(ROOT, name), "utf8");
  const lock = JSON.parse(read("package-lock.json")).packages;

  it("are the same release, so the skill's text never describes a different engine", () => {
    const skill = /^version: (\S+)$/m.exec(read(".claude/skills/impeccable/SKILL.md"))?.[1];
    expect(JSON.parse(read("package.json")).devDependencies.impeccable).toBe(skill);
    const engine = read(".claude/skills/impeccable/scripts/VERSION").trim();
    const pinned = new Set(Object.values(lock["node_modules/impeccable"].optionalDependencies));
    expect([...pinned]).toEqual([engine]);
  });

  it("checksums the same engine the lockfile pins", () => {
    const engine = read(".claude/skills/impeccable/scripts/VERSION").trim();
    const checksums = read(".claude/skills/impeccable/scripts/engine-checksums.txt");
    expect(checksums).toMatch(new RegExp(`^${engine.replaceAll(".", "\\.")} impeccable-linux-x64 [0-9a-f]{64}$`, "m"));
  });

  it("is switched to send nothing and to start no agent of its own", () => {
    const shared = JSON.parse(read(".impeccable/config.json"));
    expect(shared).toMatchObject({ telemetry: false, updateCheck: false, buildPath: "code" });
    expect(JSON.parse(read(".claude/settings.json")).env.IMPECCABLE_LIVE_COPY_AGENT).toBe("chat");
  });
});
