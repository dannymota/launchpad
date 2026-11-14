#!/usr/bin/env node
// Puts Cloudflare Access in front of the product's internal areas, as the access map in
// product/product.config.ts says. The Worker enforces the same map; this is the edge's half.
//
//   npm run access:plan  -- <staging|production>    show what Access should hold. Changes nothing.
//   npm run access:plan  -- <staging|production> --host <host>   the same from the config alone, with no token
//   npm run access:apply -- <staging|production> --email you@example.com [--email ...] [--domain example.com]
//   npm run access:check -- <staging|production>    fail unless Access matches the map. Deploy runs this.
//
// The map compiles to at most two Access applications for the Worker's host: one that
// protects every internal prefix (sign-in by emailed one-time code), and one that lets the
// public prefixes inside a protected one through. Who may sign in is asked once, with --email
// and --domain; later runs keep the people already allowed unless you name them again.
//
// On a workers.dev address Cloudflare accepts an application only once the Worker exists, so
// the very first deploy sets Access up itself: npm run deploy -- <env> --email you@example.com.
// Until Access is in place the Worker answers 404 for every internal area, so nothing is exposed.
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { accountOf, CloudflareError, cloudflareApi, hostOf, tokenFrom } from "./lib/cloudflare.mjs";
import { loadProduct, targetOf } from "./lib/product.mjs";
import { throughProxy } from "./lib/proxy.mjs";

const EMAIL = /^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/;
const DOMAIN = /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/;

export const names = (product) => ({ protect: `${product.name}: internal`, bypass: `${product.name}: public paths` });

/** An edge rule as Access writes a destination: "" is the whole host, a prefix ending in "-" matches names that start with it. */
export const uriFor = (host, rule) =>
  rule.path === "" ? host : `${host}${rule.path}${rule.path.endsWith("-") ? "*" : ""}`;

export function allowPolicy({ emails = [], domains = [] }) {
  return {
    name: "People allowed in",
    decision: "allow",
    include: [
      ...emails.map((email) => ({ email: { email } })),
      ...domains.map((domain) => ({ email_domain: { domain } })),
    ],
  };
}

/**
 * The Access applications the edge plan needs for `host`. `policies` are the protect
 * application's (who may sign in); the bypass application always lets everyone through.
 */
export function wantedApps(product, rules, host, { idpId, policies }) {
  const label = names(product);
  const destinations = (action) =>
    rules.filter((rule) => rule.action === action).map((rule) => ({ type: "public", uri: uriFor(host, rule) }));
  const apps = [];
  const protect = destinations("protect");
  if (protect.length) {
    apps.push({
      name: label.protect,
      type: "self_hosted",
      domain: protect[0].uri,
      destinations: protect,
      session_duration: "24h",
      allowed_idps: [idpId],
      auto_redirect_to_identity: true,
      app_launcher_visible: false,
      policies,
    });
  }
  const bypass = destinations("bypass");
  if (bypass.length) {
    apps.push({
      name: label.bypass,
      type: "self_hosted",
      domain: bypass[0].uri,
      destinations: bypass,
      session_duration: "24h",
      app_launcher_visible: false,
      policies: [{ name: "Everyone", decision: "bypass", include: [{ everyone: {} }] }],
    });
  }
  return apps;
}

const sorted = (list) => [...(list ?? [])].sort();
const uris = (app) => JSON.stringify(sorted((app.destinations ?? []).map((destination) => destination.uri)));
const policyKey = (policies) =>
  JSON.stringify(
    sorted(
      (policies ?? []).map((policy) =>
        JSON.stringify([policy.decision, sorted((policy.include ?? []).map((rule) => JSON.stringify(rule)))]),
      ),
    ),
  );

/** Whether an application on the account differs from the one wanted, in anything this script sets. */
export function differs(existing, wanted) {
  return (
    existing.domain !== wanted.domain ||
    uris(existing) !== uris(wanted) ||
    existing.session_duration !== wanted.session_duration ||
    JSON.stringify(sorted(existing.allowed_idps)) !== JSON.stringify(sorted(wanted.allowed_idps)) ||
    Boolean(existing.auto_redirect_to_identity) !== Boolean(wanted.auto_redirect_to_identity) ||
    policyKey(existing.policies) !== policyKey(wanted.policies)
  );
}

/** An application's policies as they would be sent back, so an update keeps who may sign in. */
export const keptPolicies = (app) =>
  (app.policies ?? []).map(({ name, decision, include, exclude, require }) => ({
    name,
    decision,
    include,
    ...(exclude?.length ? { exclude } : {}),
    ...(require?.length ? { require } : {}),
  }));

/** This product's applications on `host`, among all the account's. */
export function ours(apps, product, host) {
  const label = names(product);
  const onHost = (app) => String(app.domain ?? "").split("/")[0] === host;
  return {
    protect: apps.find((app) => app.name === label.protect && onHost(app)) ?? null,
    bypass: apps.find((app) => app.name === label.bypass && onHost(app)) ?? null,
  };
}

/** Which of the two applications one is. Only the protect application names a sign-in method. */
const kindOf = (app) => ("allowed_idps" in app ? "protect" : "bypass");

/** What to create, update and delete so the account holds exactly the wanted applications. */
export function changes(existing, wanted) {
  const steps = [];
  for (const kind of ["protect", "bypass"]) {
    const have = existing[kind];
    const want = wanted.find((app) => kindOf(app) === kind) ?? null;
    if (want && !have) steps.push({ action: "create", kind, body: want });
    else if (want && have && differs(have, want)) steps.push({ action: "update", kind, id: have.id, body: want });
    else if (!want && have) steps.push({ action: "delete", kind, id: have.id });
  }
  return steps;
}

/** Who may sign in, as typed: trimmed, lowercased, once each. Throws on anything that is not an address or a domain. */
export function people(emails, domains) {
  const out = {
    emails: [...new Set(emails.map((value) => value.trim().toLowerCase()).filter(Boolean))],
    domains: [...new Set(domains.map((value) => value.trim().toLowerCase().replace(/^@/, "")).filter(Boolean))],
  };
  const bad = [
    ...out.emails.filter((email) => !EMAIL.test(email)),
    ...out.domains.filter((domain) => !DOMAIN.test(domain)),
  ];
  if (bad.length) throw new Error(`Not an email address or a domain: ${bad.join(", ")}`);
  return out;
}

/** Makes the changes `changes()` worked out. */
export async function applySteps(cf, account, steps) {
  const base = `/accounts/${account}/access/apps`;
  for (const step of steps) {
    if (step.action === "create") await cf(base, { method: "POST", body: step.body });
    else if (step.action === "update") await cf(`${base}/${step.id}`, { method: "PUT", body: step.body });
    else await cf(`${base}/${step.id}`, { method: "DELETE" });
  }
}

export function parseArgs(argv) {
  const out = { command: argv[0], target: undefined, host: undefined, emails: [], domains: [] };
  for (let index = 1; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === "--host") out.host = String(argv[++index] ?? "").toLowerCase();
    else if (arg === "--email") out.emails.push(...String(argv[++index] ?? "").split(","));
    else if (arg === "--domain") out.domains.push(...String(argv[++index] ?? "").split(","));
    else if (!arg.startsWith("--") && !out.target) out.target = arg;
    else throw new Error(`Unknown option ${arg}. Use --email, --domain or --host.`);
  }
  if (!["plan", "apply", "check"].includes(out.command)) throw new Error("Say what to do: plan, apply or check.");
  return { ...out, ...people(out.emails, out.domains) };
}

/** The --email and --domain values on a command line, wherever they are. */
export function peopleFrom(argv) {
  const emails = [];
  const domains = [];
  argv.forEach((arg, index) => {
    if (arg === "--email") emails.push(...String(argv[index + 1] ?? "").split(","));
    if (arg === "--domain") domains.push(...String(argv[index + 1] ?? "").split(","));
  });
  return people(emails, domains);
}

const NO_ORGANIZATION = [
  "This Cloudflare account has no Zero Trust organization yet, so there is nowhere to put the sign-in.",
  "In the Cloudflare dashboard: open Zero Trust, choose a team name (it becomes <team>.cloudflareaccess.com)",
  "and the Free plan (up to 50 people; it asks for payment details). Then run this again.",
].join("\n");

/**
 * Reads what Access holds and works out the changes. Returns the team domain, the host, the
 * steps, and the protect application's audience tag when it exists already.
 */
export async function inspect({ cf, account, product, rules, host, emails = [], domains = [], create = false }) {
  const base = `/accounts/${account}/access`;
  let organization;
  try {
    organization = await cf(`${base}/organizations`);
  } catch (error) {
    if (error instanceof CloudflareError && error.status === 404) return { organization: null };
    throw error;
  }
  if (!organization?.auth_domain) return { organization: null };
  let otp = (await cf(`${base}/identity_providers`)).find((provider) => provider.type === "onetimepin") ?? null;
  if (!otp && create) {
    otp = await cf(`${base}/identity_providers`, {
      method: "POST",
      body: { name: "Email code", type: "onetimepin", config: {} },
    });
  }
  const existing = ours((await cf(`${base}/apps`)) ?? [], product, host);
  const named = emails.length + domains.length > 0;
  const policies = named
    ? [allowPolicy({ emails, domains })]
    : existing.protect
      ? keptPolicies(existing.protect)
      : null;
  const wanted = wantedApps(product, rules, host, {
    idpId: otp?.id ?? "(the one-time code sign-in)",
    policies: policies ?? [],
  });
  return {
    organization: organization.auth_domain,
    host,
    existing,
    wanted,
    steps: changes(existing, wanted),
    /** True when the protect application is needed and nobody has been named for it yet. */
    needsPeople: wanted.some((app) => app.name === names(product).protect) && !policies,
  };
}

async function main(argv) {
  const options = parseArgs(argv);
  const { product, edgePlan } = await loadProduct();
  const target = targetOf(product, options.target);
  if (options.command === "plan" && options.host) {
    // With the host given, the plan is worked out from the config alone: no token, no network.
    console.log(`${product.name} on ${options.host} (${target.name}), access preset "${product.access.preset}":`);
    for (const rule of edgePlan(product.areas)) console.log(`  ${rule.action.padEnd(8)} ${uriFor(options.host, rule)}`);
    return console.log("\nPlan from the product config only: Cloudflare was not asked what it holds.");
  }
  const cf = cloudflareApi(tokenFrom());
  const account = await accountOf(cf);
  const host = await hostOf(cf, account, target);
  const rules = edgePlan(product.areas);
  const state = await inspect({ cf, account, product, rules, host, ...options, create: options.command === "apply" });
  if (!state.organization) {
    console.error(NO_ORGANIZATION);
    process.exit(1);
  }

  console.log(`${product.name} on ${host} (${target.name}), access preset "${product.access.preset}":`);
  for (const rule of rules) console.log(`  ${rule.action.padEnd(8)} ${uriFor(host, rule)}`);
  if (state.needsPeople) {
    console.error(
      "\nNobody is allowed in yet. Name who may sign in: --email you@example.com (repeat it), or --domain example.com.",
    );
    process.exit(1);
  }
  if (state.steps.length === 0) return console.log("\nCloudflare Access matches the access map.");
  console.log("");
  for (const step of state.steps) console.log(`  ${step.action} the "${step.kind}" application`);

  if (options.command === "check") {
    console.error(`\nCloudflare Access does not match the access map. Run: npm run access:apply -- ${target.name}`);
    process.exit(1);
  }
  if (options.command === "plan") return console.log("\nPlan only: nothing was changed.");

  try {
    await applySteps(cf, account, state.steps);
  } catch (error) {
    // Cloudflare takes an application for a workers.dev address only once that Worker exists.
    if (error instanceof CloudflareError && error.status === 400 && host.endsWith(".workers.dev")) {
      console.error(
        `\nCloudflare refused the application for ${host}. On a workers.dev address the Worker has to exist first.\nDo the first deploy with the people named, and it sets Access up as soon as the Worker is there:\n  npm run deploy -- ${target.name} --email you@example.com`,
      );
      process.exit(1);
    }
    throw error;
  }
  console.log(
    `\nCloudflare Access now matches the access map. Deploy to hand the Worker its half: npm run deploy -- ${target.name}`,
  );
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  throughProxy();
  main(process.argv.slice(2)).catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
