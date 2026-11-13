// The contract's shape, kept honest. Two namespaces are tied to an access area, and the
// edge tells areas apart by path, so their REST paths must carry the same prefix.
import { describe, expect, it } from "vitest";
import { contract } from "../src/contract";

interface Found {
  name: string;
  path: string;
  method: string;
  operationId: string;
  summary: string;
  description: string;
}

/** Every procedure in the contract, with the route its `openapi()` metadata declares. */
function procedures(node: unknown, trail: string[] = []): Found[] {
  if (!node || typeof node !== "object") return [];
  const route = findRoute(node);
  if (route) return [{ name: trail.join("."), ...route }];
  return Object.entries(node).flatMap(([key, child]) => procedures(child, [...trail, key]));
}

function findRoute(node: object, depth = 0): Omit<Found, "name"> | null {
  if (depth > 6) return null;
  const record = node as Record<string, unknown>;
  if (typeof record.path === "string" && typeof record.method === "string") {
    return {
      path: record.path,
      method: record.method,
      operationId: String(record.operationId ?? ""),
      summary: String(record.summary ?? ""),
      description: String(record.description ?? ""),
    };
  }
  // A procedure keeps its definition under "~orpc"; a plain namespace has no such key.
  if (depth === 0 && !("~orpc" in record)) return null;
  for (const value of Object.values(record)) {
    if (value && typeof value === "object") {
      const found = findRoute(value, depth + 1);
      if (found) return found;
    }
  }
  return null;
}

const all = procedures(contract);

describe("the contract", () => {
  it("is read by this test", () => {
    expect(all.map((item) => item.name)).toContain("account.whoami");
    expect(all.find((item) => item.name === "account.whoami")).toMatchObject({
      method: "GET",
      path: "/account/whoami",
    });
    expect(all.length).toBeGreaterThanOrEqual(7);
  });

  it("puts admin procedures under /admin/ and nothing else there", () => {
    for (const item of all) {
      expect(item.path.startsWith("/admin/"), `${item.name} at ${item.path}`).toBe(item.name.startsWith("admin."));
    }
  });

  it("puts public-site procedures under /public/ and nothing else there", () => {
    for (const item of all) {
      expect(item.path.startsWith("/public/"), `${item.name} at ${item.path}`).toBe(item.name.startsWith("public."));
    }
  });

  it("keeps sign-in's paths free: nothing under /auth", () => {
    expect(all.filter((item) => item.path === "/auth" || item.path.startsWith("/auth/"))).toEqual([]);
  });

  it("gives every procedure a unique route and operation id, and words for people and models", () => {
    const routes = all.map((item) => `${item.method} ${item.path}`);
    expect(new Set(routes).size).toBe(routes.length);
    const ids = all.map((item) => item.operationId);
    expect(new Set(ids).size).toBe(ids.length);
    for (const item of all) {
      expect(item.operationId, item.name).toMatch(/^[a-z][A-Za-z0-9]+$/);
      expect(item.summary.length, item.name).toBeGreaterThan(5);
      expect(item.description.length, item.name).toBeGreaterThan(20);
    }
  });
});
