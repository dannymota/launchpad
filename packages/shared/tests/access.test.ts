import { describe, expect, it } from "vitest";
import { areaFor, edgePlan, normalizePath, type Preset, resolveAccess } from "../src/product";

const PRESET_NAMES: Preset[] = ["private", "internal-tool", "private-beta", "public-product"];
const visibilities = (preset: Preset) =>
  Object.fromEntries(Object.entries(resolveAccess({ preset })).map(([name, area]) => [name, area.visibility]));

describe("presets", () => {
  it("keeps everything behind Access before launch", () => {
    for (const preset of ["private", "internal-tool"] as const) {
      expect(new Set(Object.values(visibilities(preset)))).toEqual(new Set(["internal"]));
    }
  });

  it("opens only the site for a private beta", () => {
    expect(visibilities("private-beta")).toEqual({
      site: "public",
      publicApi: "public",
      signIn: "internal",
      product: "internal",
      account: "internal",
      admin: "internal",
      labs: "internal",
      api: "internal",
      adminApi: "internal",
      mcp: "internal",
    });
  });

  it("keeps admin and labs internal after launch, and nothing else", () => {
    const map = visibilities("public-product");
    expect(
      Object.entries(map)
        .filter(([, visibility]) => visibility === "internal")
        .map(([name]) => name),
    ).toEqual(["admin", "labs", "adminApi"]);
  });

  it("takes the Access email as a sign-in only where the area is internal", () => {
    for (const preset of PRESET_NAMES) {
      for (const [name, area] of Object.entries(resolveAccess({ preset }))) {
        if (area.identity === "access") expect(area.visibility, `${preset}.${name}`).toBe("internal");
      }
    }
    expect(resolveAccess({ preset: "private" }).product.identity).toBe("access");
    expect(resolveAccess({ preset: "private-beta" }).product.identity).toBe("session");
  });
});

describe("overrides", () => {
  it("can open the MCP endpoints while the product stays internal", () => {
    const map = resolveAccess({ preset: "private", areas: { mcp: { visibility: "public" } } });
    expect(map.mcp).toMatchObject({ visibility: "public", identity: "session" });
    expect(map.account.visibility).toBe("internal");
  });

  it("refuses to make admin or labs public", () => {
    expect(() => resolveAccess({ preset: "public-product", areas: { admin: { visibility: "public" } } })).toThrow(
      /admin/,
    );
    expect(() => resolveAccess({ preset: "public-product", areas: { labs: { visibility: "public" } } })).toThrow(
      /labs/,
    );
  });

  it("refuses the Access email as a sign-in on a public area", () => {
    expect(() => resolveAccess({ preset: "public-product", areas: { product: { identity: "access" } } })).toThrow(
      /public/,
    );
  });

  it("refuses a product whose API identifies people differently", () => {
    expect(() => resolveAccess({ preset: "private", areas: { api: { identity: "session" } } })).toThrow(/same way/);
  });

  it("refuses an unknown preset", () => {
    expect(() => resolveAccess({ preset: "open" as Preset })).toThrow(/Unknown/);
  });
});

describe("paths", () => {
  const map = resolveAccess({ preset: "public-product" });
  const area = (path: string) => {
    const normal = normalizePath(path);
    return normal === null ? null : areaFor(map, normal).name;
  };

  it("finds the area by its longest prefix", () => {
    expect(area("/")).toBe("site");
    expect(area("/pricing")).toBe("site");
    expect(area("/app")).toBe("product");
    expect(area("/app/projects/1")).toBe("product");
    expect(area("/application")).toBe("site");
    expect(area("/api/ping")).toBe("api");
    expect(area("/api/auth/sign-out")).toBe("api");
    expect(area("/api/public/waitlist")).toBe("publicApi");
    expect(area("/rpc/admin/users/list")).toBe("adminApi");
    expect(area("/api/administrators")).toBe("api");
    expect(area("/rpc/public/waitlist/join")).toBe("publicApi");
    expect(area("/rpc/publications")).toBe("api");
    expect(area("/authorize")).toBe("account");
    expect(area("/connect/consent")).toBe("account");
    expect(area("/mcp")).toBe("mcp");
    expect(area("/oauth/token")).toBe("mcp");
    expect(area("/.well-known/oauth-protected-resource/mcp")).toBe("mcp");
    expect(area("/.well-known/apple-app-site-association")).toBe("site");
  });

  it("sees through spellings that would dodge a prefix", () => {
    expect(area("/ADMIN/users")).toBe("admin");
    expect(area("/%61dmin")).toBe("admin");
    expect(area("/admin.rsc")).toBe("admin");
    expect(area("/admin/")).toBe("admin");
    expect(area("/labs/x.rsc")).toBe("labs");
  });

  it("refuses paths it cannot read safely", () => {
    for (const path of [
      "/app/../admin",
      "/./admin",
      "//admin",
      "/a\\b",
      "/%zz",
      "/admin%00",
      "/a%2f%2fb",
      "/x/%2e%2e/admin",
    ]) {
      expect(normalizePath(path), path).toBeNull();
    }
  });
});

describe("edge plan", () => {
  const plan = (preset: Preset, areas = {}) =>
    edgePlan(resolveAccess({ preset, areas })).map((rule) => `${rule.action} ${rule.path || "*"}`);

  it("protects the whole host while everything is internal", () => {
    expect(plan("private")).toEqual(["protect *"]);
    expect(plan("internal-tool")).toEqual(["protect *"]);
  });

  it("protects only admin and labs after launch", () => {
    expect(plan("public-product")).toEqual([
      "protect /admin",
      "protect /api/admin",
      "protect /labs",
      "protect /rpc/admin",
    ]);
  });

  it("protects each internal prefix for a private beta, and lets the public API through", () => {
    expect(plan("private-beta")).toEqual([
      "protect /.well-known/oauth-",
      "protect /admin",
      "protect /api",
      "bypass /api/public",
      "protect /app",
      "protect /authorize",
      "protect /connect",
      "protect /labs",
      "protect /mcp",
      "protect /oauth",
      "protect /rpc",
      "bypass /rpc/public",
      "protect /settings",
      "protect /sign-in",
    ]);
  });

  it("lets public MCP endpoints through a protected host", () => {
    expect(plan("private", { mcp: { visibility: "public" } })).toEqual([
      "protect *",
      "bypass /.well-known/oauth-",
      "bypass /mcp",
      "bypass /oauth",
    ]);
  });
});
