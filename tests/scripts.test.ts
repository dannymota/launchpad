// The logic of the deploy scripts (scripts/*.mjs), tested without Cloudflare: what goes into
// wrangler.jsonc, which Access applications the access map needs, which secrets are stored,
// and how an answer from a deployed product is judged.
import fs from "node:fs";
import path from "node:path";
import { defineProduct, edgePlan, type Product } from "@app/shared/product";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(import.meta.dirname, "..");
// Variables, so TypeScript does not look for types of the plain .mjs files.
const files = {
  config: "../scripts/config.mjs",
  access: "../scripts/access.mjs",
  setup: "../scripts/setup.mjs",
  smoke: "../scripts/smoke.mjs",
  deploy: "../scripts/deploy.mjs",
};
// biome-ignore lint/suspicious/noExplicitAny: the scripts are plain JavaScript.
type Any = any;
const config = (await import(files.config)) as Any;
const access = (await import(files.access)) as Any;
const setup = (await import(files.setup)) as Any;
const smoke = (await import(files.smoke)) as Any;
const deploy = (await import(files.deploy)) as Any;

const product = (overrides: Partial<Parameters<typeof defineProduct>[0]> = {}): Product =>
  defineProduct({
    name: "Acme Notes",
    slug: "acme-notes",
    tagline: "",
    domains: { app: "", email: "" },
    access: { preset: "private" },
    signIn: { emailCode: true, google: false, apple: false },
    ...overrides,
  });
const HOST = "acme-notes.example.workers.dev";

describe("wrangler.jsonc from the product config", () => {
  const original = fs.readFileSync(path.join(ROOT, "apps/web/wrangler.jsonc"), "utf8");
  const parse = (text: string) =>
    JSON.parse(
      text
        .split("\n")
        .filter((line) => !line.trim().startsWith("//"))
        .join("\n"),
    );

  it("names the Worker and its databases after the slug, for both environments", () => {
    const result = parse(config.wranglerFor(original, product()));
    expect(result.name).toBe("acme-notes");
    expect(result.d1_databases[0].database_name).toBe("acme-notes-db");
    expect(result.env.staging.name).toBe("acme-notes-staging");
    expect(result.env.staging.d1_databases[0].database_name).toBe("acme-notes-staging-db");
  });

  it("leaves out the domain and the mail binding until the config has them", () => {
    const result = parse(config.wranglerFor(original, product()));
    expect(result.routes).toBeUndefined();
    expect(result.send_email).toBeUndefined();
    expect(result.env.staging.send_email).toBeUndefined();
  });

  it("adds the domain to the live Worker only, and the mail binding to both", () => {
    const launched = product({ domains: { app: "acmenotes.com", email: "mail.acmenotes.com" } });
    const result = parse(config.wranglerFor(original, launched));
    expect(result.routes).toEqual([{ pattern: "acmenotes.com", custom_domain: true }]);
    expect(result.env.staging.routes).toBeUndefined();
    expect(result.send_email).toEqual([{ name: "EMAIL" }]);
    expect(result.env.staging.send_email).toEqual([{ name: "EMAIL" }]);
  });

  it("gives the same file however many times it runs, and undoes itself", () => {
    const launched = product({ domains: { app: "acmenotes.com", email: "mail.acmenotes.com" } });
    const once = config.wranglerFor(original, launched);
    expect(config.wranglerFor(once, launched)).toBe(once);
    // Back to this repository's own slug and no domains: the file as it is on disk.
    expect(config.wranglerFor(once, product({ slug: parse(original).name }))).toBe(original);
  });

  it("keeps every comment", () => {
    const comments = (text: string) => text.split("\n").filter((line) => line.trim().startsWith("//")).length;
    expect(comments(config.wranglerFor(original, product()))).toBe(comments(original));
  });
});

describe("Access applications from the access map", () => {
  const apps = (item: Product, policies = [access.allowPolicy({ emails: ["owner@example.com"] })]) =>
    access.wantedApps(item, edgePlan(item.areas), HOST, { idpId: "idp-1", policies });
  const destinations = (app: Any) => app.destinations.map((destination: Any) => destination.uri);

  it("protects the whole host before launch, with nothing let through", () => {
    const [protect, ...rest] = apps(product());
    expect(rest).toEqual([]);
    expect(destinations(protect)).toEqual([HOST]);
    expect(protect.policies[0]).toMatchObject({
      decision: "allow",
      include: [{ email: { email: "owner@example.com" } }],
    });
    expect(protect.allowed_idps).toEqual(["idp-1"]);
  });

  it("protects only admin and labs once the product is public", () => {
    const wanted = apps(product({ access: { preset: "public-product" } }));
    expect(wanted).toHaveLength(1);
    expect(destinations(wanted[0])).toEqual([
      `${HOST}/admin`,
      `${HOST}/api/admin`,
      `${HOST}/labs`,
      `${HOST}/rpc/admin`,
    ]);
  });

  it("lets the public API through a protected API during a private beta", () => {
    const [protect, bypass] = apps(product({ access: { preset: "private-beta" } }));
    expect(destinations(protect)).toContain(`${HOST}/app`);
    expect(destinations(protect)).not.toContain(HOST);
    expect(destinations(bypass)).toEqual([`${HOST}/api/public`, `${HOST}/rpc/public`]);
    expect(bypass.policies).toEqual([{ name: "Everyone", decision: "bypass", include: [{ everyone: {} }] }]);
  });

  it("writes a prefix that ends in a dash as a wildcard", () => {
    expect(access.uriFor(HOST, { path: "/.well-known/oauth-" })).toBe(`${HOST}/.well-known/oauth-*`);
    expect(access.uriFor(HOST, { path: "/admin" })).toBe(`${HOST}/admin`);
    expect(access.uriFor(HOST, { path: "" })).toBe(HOST);
  });

  it("allows whole email domains as well as single addresses", () => {
    expect(access.allowPolicy({ emails: ["a@x.com"], domains: ["corp.example"] }).include).toEqual([
      { email: { email: "a@x.com" } },
      { email_domain: { domain: "corp.example" } },
    ]);
  });

  it("works out what to create, update and delete", () => {
    const beta = product({ access: { preset: "private-beta" } });
    const wanted = apps(beta);
    const none = { protect: null, bypass: null };
    expect(access.changes(none, wanted).map((step: Any) => `${step.action} ${step.kind}`)).toEqual([
      "create protect",
      "create bypass",
    ]);
    const live = { protect: { id: "p1", ...wanted[0] }, bypass: { id: "b1", ...wanted[1] } };
    expect(access.changes(live, wanted)).toEqual([]);
    // Launching: the product's prefixes stop being protected, and nothing needs letting through.
    const launched = apps(product({ access: { preset: "public-product" } }));
    expect(access.changes(live, launched).map((step: Any) => `${step.action} ${step.kind}`)).toEqual([
      "update protect",
      "delete bypass",
    ]);
  });

  it("notices a change in who may sign in, and keeps the people already allowed", () => {
    const wanted = apps(product());
    const live = { id: "p1", ...wanted[0] };
    const other = apps(product(), [access.allowPolicy({ emails: ["someone-else@example.com"] })]);
    expect(access.differs(live, other[0])).toBe(true);
    expect(
      access.keptPolicies({
        policies: [{ id: "x", name: "n", decision: "allow", include: [{ everyone: {} }], exclude: [] }],
      }),
    ).toEqual([{ name: "n", decision: "allow", include: [{ everyone: {} }] }]);
  });

  it("finds this product's applications by name and host, and no one else's", () => {
    const label = access.names(product());
    const all = [
      { id: "1", name: label.protect, domain: HOST },
      { id: "2", name: label.protect, domain: "other.example.workers.dev" },
      { id: "3", name: "Someone else's app", domain: `${HOST}/admin` },
    ];
    expect(access.ours(all, product(), HOST)).toEqual({ protect: all[0], bypass: null });
  });

  it("reads who may sign in from the command line, and refuses what is not an address", () => {
    const parsed = access.parseArgs(["apply", "staging", "--email", "A@X.com,b@y.com", "--domain", "@Corp.Example"]);
    expect(parsed).toMatchObject({
      command: "apply",
      target: "staging",
      emails: ["a@x.com", "b@y.com"],
      domains: ["corp.example"],
    });
    expect(() => access.parseArgs(["apply", "staging", "--email", "not-an-address"])).toThrow("Not an email");
    expect(() => access.parseArgs(["nonsense", "staging"])).toThrow("plan, apply or check");
  });
});

describe("secrets", () => {
  const random = () => Buffer.from("fixed-test-bytes-fixed-test-bytes-123");

  it("generates the signing secret once, and never again", () => {
    expect(setup.secretsToSet({ existing: [], env: {}, random })).toEqual({
      BETTER_AUTH_SECRET: random().toString("base64"),
    });
    expect(setup.secretsToSet({ existing: ["BETTER_AUTH_SECRET"], env: {}, random })).toEqual({});
  });

  it("stores only the settings it knows, from the environment", () => {
    const env = {
      GOOGLE_CLIENT_ID: " id ",
      PATH: "/usr/bin",
      CLOUDFLARE_API_TOKEN: "never",
      STRIPE_PRICE_PRO: "price_1",
      ADMIN_EMAILS: "",
    };
    expect(setup.secretsToSet({ existing: ["BETTER_AUTH_SECRET"], env })).toEqual({
      GOOGLE_CLIENT_ID: "id",
      STRIPE_PRICE_PRO: "price_1",
    });
  });

  it("reads secret names from wrangler's output, whatever is printed before it", () => {
    expect(
      setup.secretNames('A notice.\n[{"name":"A","type":"secret_text"},{"name":"B","type":"secret_text"}]'),
    ).toEqual(["A", "B"]);
    expect(() => setup.secretNames("no list here")).toThrow();
  });
});

describe("judging a deployed product from outside", () => {
  const internal = { visibility: "internal" };
  const open = { visibility: "public" };

  it("wants Cloudflare Access itself in front of an internal area", () => {
    const signIn = { status: 302, location: "https://team.cloudflareaccess.com/cdn-cgi/access/login/x" };
    expect(smoke.judge(internal, smoke.PROBES.admin, signIn).ok).toBe(true);
    // Hidden by the Worker alone is not enough: the edge is not doing its half.
    expect(smoke.judge(internal, smoke.PROBES.admin, { status: 404, location: null })).toMatchObject({ ok: false });
    expect(smoke.judge(internal, smoke.PROBES.admin, { status: 200, location: null })).toMatchObject({ ok: false });
  });

  it("wants a public area to answer, and not to be behind Access by mistake", () => {
    expect(smoke.judge(open, smoke.PROBES.site, { status: 200, location: null }).ok).toBe(true);
    expect(smoke.judge(open, smoke.PROBES.product, { status: 307, location: "/sign-in?next=%2Fapp" }).ok).toBe(true);
    expect(smoke.judge(open, smoke.PROBES.api, { status: 500, location: null }).ok).toBe(false);
    const behindAccess = { status: 302, location: "https://team.cloudflareaccess.com/cdn-cgi/access/login/x" };
    expect(smoke.judge(open, smoke.PROBES.site, behindAccess).ok).toBe(false);
  });

  it("checks /health and every area the product has", async () => {
    const item = product();
    const fetched: string[] = [];
    const fake = async (url: string) => {
      fetched.push(new URL(url).pathname);
      if (url.endsWith("/health"))
        return Response.json({ ok: true, version: "v1", access: { preset: "private", configured: true } });
      return new Response(null, { status: 302, headers: { location: "https://team.cloudflareaccess.com/login" } });
    };
    const rows = await smoke.smoke("https://x.example", item, fake);
    expect(rows.every((row: Any) => row.ok)).toBe(true);
    expect(fetched).toContain("/admin");
    expect(rows).toHaveLength(1 + Object.keys(item.areas).length);
  });

  it("fails when the deployed preset is not the one in the config", async () => {
    const fake = async (url: string) =>
      url.endsWith("/health")
        ? Response.json({ ok: true, version: "v1", access: { preset: "public-product", configured: true } })
        : new Response(null, { status: 302, headers: { location: "https://team.cloudflareaccess.com/login" } });
    const rows = await smoke.smoke("https://x.example", product(), fake);
    expect(rows[0]).toMatchObject({ what: "/health", ok: false });
  });
});

describe("deploying", () => {
  it("needs the product's slug as a second key to go live", () => {
    expect(() => deploy.parseArgs(["production"], "acme-notes")).toThrow("--confirm acme-notes");
    expect(() => deploy.parseArgs(["production", "--confirm", "wrong"], "acme-notes")).toThrow();
    expect(deploy.parseArgs(["production", "--confirm", "acme-notes"], "acme-notes")).toMatchObject({
      name: "production",
    });
    expect(deploy.parseArgs(["staging", "--skip-checks"], "acme-notes")).toEqual({ name: "staging", skipChecks: true });
  });
});
