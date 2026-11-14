// Who can reach what, proven for every preset. The expectations below are worked out from
// the access map alone (the oracle), not from the router's code, then checked against the
// running Worker: every area, as nobody, through Cloudflare Access, with a session, with both,
// and as an admin.
import { AREA_NAMES, type Area, type AreaName } from "@app/shared/product";
import { beforeAll, describe, expect, it } from "vitest";
import { ADMIN_EMAIL, accessToken, Browser, migrate, ORIGIN, signIn } from "./harness";
import { PRODUCTS, type ProductName } from "./products";

/** One request per area, and how to tell that the area's own handler answered it. */
const PROBES: Record<AreaName, { path: string; method?: "POST"; reached: (status: number, body: string) => boolean }> =
  {
    site: { path: "/pricing", reached: (_, body) => body.includes('"page":"/pricing"') },
    signIn: { path: "/sign-in", reached: (_, body) => body.includes('"page":"/sign-in"') },
    product: { path: "/app/home", reached: (_, body) => body.includes('"page":"/app/home"') },
    account: { path: "/settings", reached: (_, body) => body.includes('"page":"/settings"') },
    admin: { path: "/admin/users", reached: (_, body) => body.includes('"page":"/admin/users"') },
    labs: { path: "/labs/idea", reached: (_, body) => body.includes('"page":"/labs/idea"') },
    api: { path: "/api/ping", reached: (status) => status === 200 },
    publicApi: {
      path: "/api/public/none",
      reached: (status, body) => status === 404 && body.includes("No such API route"),
    },
    adminApi: { path: "/api/admin/users", reached: (status, body) => status === 200 && body.includes('"users"') },
    // >>> mcp
    mcp: { path: "/mcp", method: "POST", reached: (status) => status === 401 },
    // <<< mcp
  };

const VISITORS = {
  nobody: { access: null, session: false },
  "through Access": { access: "member@example.com", session: false },
  "with a session": { access: null, session: true },
  "through Access with a session": { access: "member@example.com", session: true },
  "an admin through Access": { access: ADMIN_EMAIL, session: false },
} as const;
type Visitor = (typeof VISITORS)[keyof typeof VISITORS];

/** What the access map says should happen, written from its definition. */
function expected(area: Area, visitor: Visitor): "reached" | "hidden" | "sign-in" {
  if (area.visibility === "internal" && !visitor.access) return "hidden";
  if (area.auth === "none") return "reached";
  const signedIn = area.identity === "access" ? Boolean(visitor.access) : visitor.session;
  if (area.auth === "admin") return area.identity === "access" && visitor.access === ADMIN_EMAIL ? "reached" : "hidden";
  return signedIn ? "reached" : "sign-in";
}

const PRESETS = [
  "private",
  "internal-tool",
  "private-beta",
  "public-product",
] as const satisfies readonly ProductName[];
let session: Browser;

beforeAll(async () => {
  await migrate();
  // A real session, made where email sign-in is on; the cookie is then tried under every preset.
  ({ browser: session } = await signIn("member@example.com"));
});

describe.each(PRESETS)("preset %s", (preset) => {
  const map = PRODUCTS[preset].areas;
  const cases = AREA_NAMES.flatMap((area) =>
    Object.entries(VISITORS).map(([who, visitor]) => ({ area, who, visitor, want: expected(map[area], visitor) })),
  );

  it.each(cases)("$area, $who: $want", async ({ area, visitor, want }) => {
    const probe = PROBES[area];
    const base = visitor.session ? session : new Browser();
    const browser = base.as({ product: preset, accessEmail: visitor.access ?? undefined });
    const response = probe.method ? await browser.post(probe.path, {}) : await browser.page(probe.path);
    const body = await response.text();
    if (want === "reached") expect(probe.reached(response.status, body), `${response.status} ${body}`).toBe(true);
    if (want === "hidden") {
      expect(response.status, body).toBe(404);
      expect(body).toContain('"Not found."');
    }
    if (want === "sign-in") {
      expect(response.status, body).toBe(302);
      expect(response.headers.get("location")).toBe(`/sign-in?next=${encodeURIComponent(probe.path)}`);
    }
  });

  it("answers /health without credentials and names the preset", async () => {
    const response = await new Browser({ product: preset }).fetch("/health");
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ access: { preset, configured: true } });
  });
});

describe("Cloudflare Access tokens", () => {
  const admin = (accessJwt: string) => new Browser({ product: "public-product", accessJwt }).page("/admin/users");

  it("accepts a token for any of this Worker's audiences", async () => {
    expect((await admin(await accessToken(ADMIN_EMAIL, { audience: "test-audience-one" }))).status).toBe(200);
    expect((await admin(await accessToken(ADMIN_EMAIL, { audience: "test-audience-two" }))).status).toBe(200);
  });

  it("refuses a token for another application, another team, or one that has expired", async () => {
    expect((await admin(await accessToken(ADMIN_EMAIL, { audience: "someone-elses-app" }))).status).toBe(404);
    expect((await admin(await accessToken(ADMIN_EMAIL, { issuer: "https://evil.cloudflareaccess.com" }))).status).toBe(
      404,
    );
    expect((await admin(await accessToken(ADMIN_EMAIL, { expiresInSeconds: -60 }))).status).toBe(404);
  });

  it("refuses a token that is not signed by Access", async () => {
    const [head, body] = (await accessToken(ADMIN_EMAIL)).split(".");
    expect((await admin(`${head}.${body}.AAAA`)).status).toBe(404);
    const unsigned = `${btoa(JSON.stringify({ alg: "none" }))}.${body}.`;
    expect((await admin(unsigned)).status).toBe(404);
  });

  it("lets a service token into an internal area, but it is nobody: not signed in, not an admin", async () => {
    const service = new Browser({ product: "private", accessJwt: await accessToken(null) });
    expect((await service.page("/labs/idea")).status).toBe(200);
    expect((await service.page("/app/home")).status).toBe(302);
    expect((await service.page("/admin/users")).status).toBe(404);
    expect((await service.fetch("/api/account/whoami")).status).toBe(401);
  });

  it("ignores the Access cookie: only the header Access adds counts", async () => {
    const response = await new Browser({ product: "private" }).fetch("/pricing", {
      headers: { cookie: `CF_Authorization=${await accessToken(ADMIN_EMAIL)}` },
    });
    expect(response.status).toBe(404);
  });
});

describe("the Access email as a sign-in", () => {
  it("is an account from the first request, and the same one on every later request", async () => {
    const browser = new Browser({ product: "private", accessEmail: "Founder@Example.com" });
    const first = (await (await browser.fetch("/api/account/whoami")).json()) as { id: string; email: string };
    expect(first.email).toBe("founder@example.com");
    const again = (await (await browser.fetch("/api/account/whoami")).json()) as { id: string };
    expect(again.id).toBe(first.id);
  });

  it("becomes the same account when the product later opens and the person signs in by email", async () => {
    const before = new Browser({ product: "private", accessEmail: "early@example.com" });
    const { id } = (await (await before.fetch("/api/account/whoami")).json()) as { id: string };
    const { userId } = await signIn("early@example.com");
    expect(userId).toBe(id);
  });

  it("is never taken in a public area, whatever headers a client sends", async () => {
    const forged = { "x-app-identity": "access", "x-app-access-email": ADMIN_EMAIL, "x-app-origin": ORIGIN };
    const outsider = new Browser({ product: "public-product" });
    expect((await outsider.fetch("/api/account/whoami", { headers: forged })).status).toBe(401);
    expect((await outsider.fetch("/api/admin/users", { headers: forged })).status).toBe(404);
    // Even with a real Access token: the product is public, so it identifies people by session.
    const member = new Browser({ product: "public-product", accessEmail: "member@example.com" });
    expect((await member.fetch("/api/account/whoami")).status).toBe(401);
  });

  it("turns Better Auth sign-in off while the Access email is the sign-in", async () => {
    const browser = new Browser({ product: "private", accessEmail: "member@example.com" });
    const response = await browser.post("/api/auth/email-otp/send-verification-otp", {
      email: "x@example.com",
      type: "sign-in",
    });
    expect(response.status).toBe(404);
    expect(await (await browser.fetch("/health")).json()).toMatchObject({ signIn: { emailCode: false } });
  });
});

describe("paths that try to slip past an area", () => {
  const outsider = new Browser({ product: "public-product" });

  it("treats every spelling of an internal prefix as internal", async () => {
    for (const path of [
      "/ADMIN/users",
      "/%61dmin/users",
      "/admin.rsc",
      "/Labs/idea",
      "/api/%61dmin/users",
      "/API/ADMIN/users",
      "/rpc/admin/users/list",
    ]) {
      expect((await outsider.page(path)).status, path).toBe(404);
    }
  });

  it("refuses paths it cannot read safely", async () => {
    for (const path of ["/app/%2e%2e/admin", "/x%00", "/a%5cb", "/%zz"]) {
      const response = await outsider.fetch(path);
      expect(response.status, path).toBe(404);
      expect(await response.text(), path).not.toContain('"page"');
    }
  });

  it("serves machine endpoints only at the path as written", async () => {
    expect((await outsider.fetch("/API/ping")).status).toBe(404);
    expect((await outsider.fetch("/api/pin%67")).status).toBe(404);
    expect((await outsider.fetch("/api/ping")).status).toBe(200);
  });

  it("refuses to run in a local mode on a public host", async () => {
    const response = await outsider.fetch("https://product.example/health");
    expect(response.status).toBe(500);
  });
});
