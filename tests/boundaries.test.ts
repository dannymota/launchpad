// The shape of the repo, kept honest. These tests read source files and fail when a change
// puts something where it does not belong:
//
//   - surfaces (apps/*) do not import each other; only the Worker mounts apps/mcp;
//   - only packages/backend touches the database, and only through its index;
//   - packages/shared and packages/theme run anywhere: no React, Next, Cloudflare or Node;
//   - the backend is layered, with no import cycles;
//   - code that runs in the browser imports no server code;
//   - no source file grows past the point where it should have been split.
//
// Type-only imports are exempt everywhere: they vanish when the code is built.
import fs from "node:fs";
import { builtinModules } from "node:module";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(import.meta.dirname, "..");
const MAX_LINES = 700;

/** Backend folders, lowest first. A module imports from its own layer or the ones before it. */
const BACKEND_LAYERS = ["db", "core", "safety", "integrations", "accounts", "features", "modules", "api"];
/** Files at the top of packages/backend/src: env.ts is below every layer, index.ts above. */
const BACKEND_ROOT_FILES: Record<string, number> = { "env.ts": -1, "index.ts": BACKEND_LAYERS.length };

/** Generated files: not ours to split or restructure. */
const GENERATED = new Set([
  "packages/backend/src/db/schema/auth.ts",
  "apps/web/astryx-themes.ts",
  "packages/theme/src/palette.ts",
  "packages/theme/src/generated/native-tokens.ts",
]);

function walk(dir: string, out: string[] = []): string[] {
  const full = path.join(ROOT, dir);
  if (!fs.existsSync(full)) return out;
  for (const entry of fs.readdirSync(full, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "dist" || entry.name.startsWith(".")) continue;
    const child = path.posix.join(dir, entry.name);
    if (entry.isDirectory()) walk(child, out);
    else if (/\.(?:tsx?|mjs)$/.test(entry.name)) out.push(child);
  }
  return out;
}

const read = (file: string) => fs.readFileSync(path.join(ROOT, file), "utf8");
const code = (file: string) =>
  read(file)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

/** The modules a file needs when it runs: `import type` and `{ type X }`-only imports are left out. */
function runtimeImports(file: string): string[] {
  const text = code(file);
  const found: string[] = [];
  for (const match of text.matchAll(/^\s*(?:import|export)\s+(type\s+)?([^;'"]*?)\s*from\s*["']([^"']+)["']/gm)) {
    const [, wholeType, clause = "", spec = ""] = match;
    if (wholeType) continue;
    const braces = clause.match(/\{([^}]*)\}/);
    const names = (braces?.[1] ?? "")
      .split(",")
      .map((name) => name.trim())
      .filter(Boolean);
    const onlyTypes =
      clause.trim().startsWith("{") && names.length > 0 && names.every((name) => name.startsWith("type "));
    if (!onlyTypes) found.push(spec);
  }
  for (const match of text.matchAll(/^\s*import\s*["']([^"']+)["']/gm)) found.push(match[1] ?? "");
  for (const match of text.matchAll(/\bimport\(\s*["']([^"']+)["']\s*\)/g)) found.push(match[1] ?? "");
  return found;
}

const WORKSPACES: Record<string, string> = {
  "@app/backend": "packages/backend/src/index.ts",
  "@app/shared": "packages/shared/src/index.ts",
  "@app/shared/contract": "packages/shared/src/contract/index.ts",
  "@app/shared/client": "packages/shared/src/client.ts",
  "@app/shared/product": "packages/shared/src/product/index.ts",
  "@app/product": "product/product.config.ts",
  "@app/theme": "packages/theme/src/index.ts",
  "@app/theme/native": "packages/theme/src/native.ts",
  "@app/mcp": "apps/mcp/index.ts",
};

/** The repo file a specifier points at, or null for an npm package or a built-in. */
function resolve(spec: string, from: string): string | null {
  if (spec in WORKSPACES) return WORKSPACES[spec] ?? null;
  let base: string | null = null;
  // "@/" is each app's own alias: the web app's root, the mobile app's src folder.
  if (spec.startsWith("@/"))
    base = path.posix.join(from.startsWith("apps/mobile/") ? "apps/mobile/src" : "apps/web", spec.slice(2));
  else if (spec.startsWith(".")) base = path.posix.normalize(path.posix.join(path.posix.dirname(from), spec));
  if (base === null) return null;
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, `${base}.mjs`, `${base}/index.ts`, `${base}/index.tsx`]) {
    const full = path.join(ROOT, candidate);
    if (fs.existsSync(full) && fs.statSync(full).isFile()) return candidate;
  }
  return null;
}

const SOURCES = [...walk("apps"), ...walk("packages"), ...walk("product"), ...walk("scripts"), ...walk("tests")];
const specs = new Map(SOURCES.map((file) => [file, runtimeImports(file)]));
const graph = new Map(
  SOURCES.map((file) => [
    file,
    (specs.get(file) ?? []).map((spec) => resolve(spec, file)).filter((target): target is string => target !== null),
  ]),
);
const edges = (keep: (file: string, target: string) => boolean) =>
  [...graph].flatMap(([file, targets]) =>
    targets.filter((target) => keep(file, target)).map((target) => `${file} -> ${target}`),
  );
const packageUses = (file: string, pattern: RegExp) => (specs.get(file) ?? []).filter((spec) => pattern.test(spec));
const surfaceOf = (file: string) => /^(apps\/[^/]+|packages\/[^/]+|product)\//.exec(file)?.[1] ?? "";

describe("the checker itself", () => {
  it("reads the imports it judges", () => {
    // A parser that silently found nothing would pass every rule below.
    expect(SOURCES.length).toBeGreaterThan(30);
    expect(edges(() => true).length).toBeGreaterThan(40);
    expect(graph.get("apps/web/worker/router.ts")).toContain("packages/backend/src/index.ts");
  });
});

describe("surfaces", () => {
  it("do not import each other; only the Worker mounts the MCP surface", () => {
    const crossing = edges((file, target) => {
      const from = surfaceOf(file);
      const to = surfaceOf(target);
      if (!from.startsWith("apps/") || !to.startsWith("apps/") || from === to) return false;
      // The Worker mounts the MCP surface, and its tests mount it with extra servers.
      return !(/^apps\/web\/(worker|tests)\//.test(file) && to === "apps/mcp");
    });
    expect(crossing).toEqual([]);
  });

  it("reach other packages through their public entry points only", () => {
    const deep = [...specs].flatMap(([file, list]) =>
      list.filter((spec) => /^@app\//.test(spec) && !(spec in WORKSPACES)).map((spec) => `${file} -> ${spec}`),
    );
    const relative = edges(
      (file, target) =>
        surfaceOf(file) !== surfaceOf(target) && !(specs.get(file) ?? []).some((spec) => WORKSPACES[spec] === target),
    );
    expect([...deep, ...relative]).toEqual([]);
  });

  it("leave the database to the backend", () => {
    const outside = SOURCES.filter((file) => !file.startsWith("packages/backend/"));
    const imports = outside.flatMap((file) =>
      packageUses(file, /^(drizzle-orm|drizzle-kit|@better-auth\/drizzle-adapter)(\/|$)/).map(
        (spec) => `${file} -> ${spec}`,
      ),
    );
    // Tests may seed and inspect the database directly; shipped code may not.
    const direct = outside.filter((file) => !/(^|\/)tests\//.test(file) && /\benv\.DB\b|\.prepare\(/.test(code(file)));
    expect([...imports, ...direct]).toEqual([]);
  });

  it("keep platform-only code behind the platform folder in the mobile app", () => {
    // Only src/platform may import a module that exists on one platform; screens ask through it.
    const platformOnly = /^(expo-apple-authentication|expo-secure-store|expo-haptics)(\/|$)/;
    const outside = SOURCES.filter(
      (file) => file.startsWith("apps/mobile/src/") && !file.startsWith("apps/mobile/src/platform/"),
    );
    expect(outside.flatMap((file) => packageUses(file, platformOnly).map((spec) => `${file} -> ${spec}`))).toEqual([]);
    expect(SOURCES.some((file) => file === "apps/mobile/src/platform/index.ios.ts")).toBe(true);
    expect(SOURCES.some((file) => file === "apps/mobile/src/platform/index.android.ts")).toBe(true);
  });

  it("keep the mobile app to the shared packages", () => {
    const reaching = edges(
      (file, target) =>
        file.startsWith("apps/mobile/") &&
        !target.startsWith("apps/mobile/") &&
        !/^packages\/(shared|theme)\//.test(target),
    );
    expect(reaching).toEqual([]);
  });
});

describe("the product config", () => {
  it("is plain data: it imports only the shared package", () => {
    const files = SOURCES.filter((file) => file.startsWith("product/"));
    expect(files.length).toBeGreaterThan(0);
    const other = files.flatMap((file) =>
      (specs.get(file) ?? []).filter((spec) => !spec.startsWith("@app/shared")).map((spec) => `${file} -> ${spec}`),
    );
    expect(other).toEqual([]);
  });
});

describe("shared packages", () => {
  const PORTABLE = SOURCES.filter((file) => /^packages\/(shared|theme)\/src\//.test(file));

  it("run anywhere: no React, Next, Cloudflare or Node modules", () => {
    const frameworks = /^(?:react|react-dom|react-native|next|vinext|expo|wrangler)(?:\/|$)/;
    const runtimes = /^(?:cloudflare:|node:|@cloudflare\/)/;
    const isBanned = (spec: string) => frameworks.test(spec) || runtimes.test(spec) || builtinModules.includes(spec);
    const uses = PORTABLE.flatMap((file) =>
      (specs.get(file) ?? []).filter(isBanned).map((spec) => `${file} -> ${spec}`),
    );
    expect(uses).toEqual([]);
  });

  it("import no server or surface code", () => {
    expect(edges((file, target) => PORTABLE.includes(file) && !/^packages\/(shared|theme)\//.test(target))).toEqual([]);
  });
});

describe("backend", () => {
  const BACKEND = SOURCES.filter((file) => file.startsWith("packages/backend/src/"));
  const layerOf = (file: string): number | null => {
    const [first = "", ...rest] = file.slice("packages/backend/src/".length).split("/");
    if (rest.length === 0) return BACKEND_ROOT_FILES[first] ?? null;
    const index = BACKEND_LAYERS.indexOf(first);
    return index === -1 ? null : index;
  };

  it("puts every module in a layer", () => {
    expect(BACKEND.filter((file) => layerOf(file) === null)).toEqual([]);
  });

  it("lets a module import only from its own layer or below", () => {
    const upward = edges((file, target) => {
      if (!BACKEND.includes(file) || !BACKEND.includes(target)) return false;
      return (layerOf(target) ?? 0) > (layerOf(file) ?? 0);
    });
    expect(upward).toEqual([]);
  });

  it("has no import cycles", () => {
    const cycles: string[] = [];
    const state = new Map<string, "open" | "done">();
    const visit = (file: string, trail: string[]) => {
      if (state.get(file) === "done") return;
      if (state.get(file) === "open") {
        cycles.push([...trail.slice(trail.indexOf(file)), file].join(" -> "));
        return;
      }
      state.set(file, "open");
      for (const target of graph.get(file) ?? []) visit(target, [...trail, file]);
      state.set(file, "done");
    };
    for (const file of SOURCES) visit(file, []);
    expect(cycles).toEqual([]);
  });

  it("never opens an interactive transaction: D1 has none, use db.batch", () => {
    expect(BACKEND.filter((file) => /\.transaction\(/.test(code(file)))).toEqual([]);
  });

  it("has no pages: no React or Next imports", () => {
    const banned = /^(react|react-dom|next|vinext)(\/|$)/;
    expect(BACKEND.flatMap((file) => packageUses(file, banned).map((spec) => `${file} -> ${spec}`))).toEqual([]);
  });
});

describe("browser code", () => {
  const CLIENT = SOURCES.filter((file) => file.startsWith("apps/web/") && /^\s*["']use client["']/.test(code(file)));

  it("imports no server code", () => {
    const reaching = edges(
      (file, target) =>
        CLIENT.includes(file) &&
        (target.startsWith("packages/backend/") ||
          target === "apps/web/lib/server.ts" ||
          target.startsWith("apps/web/worker/")),
    );
    expect(CLIENT.length).toBeGreaterThan(2);
    expect(reaching).toEqual([]);
  });
});

describe("file size", () => {
  it(`keeps every source file under ${MAX_LINES} lines`, () => {
    const long = SOURCES.filter((file) => !GENERATED.has(file) && read(file).split("\n").length > MAX_LINES);
    expect(long).toEqual([]);
  });
});
