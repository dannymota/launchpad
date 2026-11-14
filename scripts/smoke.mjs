#!/usr/bin/env node
// Looks at a deployed product from outside, with no sign-in and no Access token, and checks
// that each area answers the way the access map says: internal areas stop at the Cloudflare
// Access sign-in, public ones answer.
//
//   npm run smoke -- https://product.example
//   npm run smoke -- <staging|production>      works out the address (needs CLOUDFLARE_API_TOKEN)
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadProduct, targetOf } from "./lib/product.mjs";
import { throughProxy } from "./lib/proxy.mjs";

/** One path to try in each area, and what a public area answers to a stranger. */
export const PROBES = {
  site: { path: "/", open: [200, 307, 308] },
  signIn: { path: "/sign-in", open: [200] },
  // A signed-out visitor is sent to sign-in.
  product: { path: "/app", open: [302, 307] },
  account: { path: "/settings", open: [302, 307] },
  admin: { path: "/admin", open: [] },
  labs: { path: "/labs", open: [] },
  api: { path: "/api/ping", open: [200] },
  publicApi: { path: "/api/public/none", open: [404] },
  adminApi: { path: "/api/admin/users", open: [] },
  mcp: { path: "/mcp", method: "POST", open: [401] },
};

/**
 * Whether an answer is right for the area. An internal area must be stopped by Cloudflare
 * Access itself: a redirect to the team's sign-in. A 404 there means the Worker hid the area
 * but the edge did not, so the edge and the map disagree.
 */
export function judge(area, probe, answer) {
  if (area.visibility === "internal") {
    if (answer.status >= 300 && answer.status < 400 && /cloudflareaccess\.com/.test(answer.location ?? ""))
      return { ok: true, saw: "Access sign-in" };
    if (answer.status === 404)
      return { ok: false, saw: "404 from the Worker: Cloudflare Access is not in front of this path" };
    return { ok: false, saw: `${answer.status}: an internal area answered a stranger` };
  }
  if (/cloudflareaccess\.com/.test(answer.location ?? "")) return { ok: false, saw: "Access sign-in on a public area" };
  return probe.open.includes(answer.status)
    ? { ok: true, saw: String(answer.status) }
    : { ok: false, saw: `${answer.status}, expected ${probe.open.join(" or ")}` };
}

/**
 * /health, as a stranger gets it. When the whole host is behind Cloudflare Access (the site is
 * internal), /health is behind it too: the Access sign-in is then the right answer, and what
 * the Worker would say cannot be read from outside.
 */
async function healthRow(origin, product, fetchImpl) {
  const response = await fetchImpl(`${origin}/health`, { redirect: "manual" }).catch(() => null);
  if (!response) return { what: "/health", ok: false, saw: "no answer" };
  const location = response.headers.get("location") ?? "";
  if (response.status >= 300 && response.status < 400 && /cloudflareaccess\.com/.test(location)) {
    await response.body?.cancel();
    const expected = product.areas.site.visibility === "internal";
    return {
      what: "/health",
      ok: expected,
      saw: expected ? "Access sign-in, as for the whole host" : "Access sign-in, but the site is meant to be public",
    };
  }
  const health = await response.json().catch(() => null);
  if (!health) return { what: "/health", ok: false, saw: `${response.status}, not the health report` };
  return {
    what: "/health",
    ok: Boolean(health.ok) && health.access?.preset === product.access.preset && health.access?.configured === true,
    saw: `preset ${health.access?.preset}, Access ${health.access?.configured ? "set up" : "NOT set up"}, build ${health.version}`,
  };
}

export async function smoke(origin, product, fetchImpl = globalThis.fetch) {
  const rows = [];
  rows.push(await healthRow(origin, product, fetchImpl));
  for (const [name, area] of Object.entries(product.areas)) {
    const probe = PROBES[name];
    if (!probe) continue;
    const response = await fetchImpl(origin + probe.path, { method: probe.method ?? "GET", redirect: "manual" }).catch(
      () => null,
    );
    const answer = response
      ? { status: response.status, location: response.headers.get("location") }
      : { status: 0, location: null };
    await response?.body?.cancel();
    rows.push({ what: `${name} ${probe.path} (${area.visibility})`, ...judge(area, probe, answer) });
  }
  return rows;
}

async function main(argv) {
  const { product } = await loadProduct();
  let origin = argv[0];
  if (!origin) throw new Error("Give the address to check, or staging or production.");
  if (!/^https?:\/\//.test(origin)) {
    const { accountOf, cloudflareApi, hostOf, tokenFrom } = await import("./lib/cloudflare.mjs");
    const cf = cloudflareApi(tokenFrom());
    origin = `https://${await hostOf(cf, await accountOf(cf), targetOf(product, origin))}`;
  }
  origin = origin.replace(/\/$/, "");
  console.log(`Checking ${origin} from outside:\n`);
  const rows = await smoke(origin, product);
  for (const row of rows) console.log(`  ${row.ok ? "ok  " : "FAIL"} ${row.what.padEnd(42)} ${row.saw}`);
  const failed = rows.filter((row) => !row.ok);
  if (failed.length) {
    console.error(`\n${failed.length} of ${rows.length} checks failed.`);
    process.exit(1);
  }
  console.log(`\nAll ${rows.length} checks passed.`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  throughProxy();
  main(process.argv.slice(2)).catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
