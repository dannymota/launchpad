#!/usr/bin/env node
// Deploys the product, in the one order that is safe:
//
//   1. the files generated from the product config are in step with it
//   2. Cloudflare Access matches the access map (so nothing internal is exposed)
//   3. the full check passes
//   4. the build, for the chosen environment
//   5. the database exists and its migrations are applied
//   6. the Worker is deployed
//   7. its secrets are set: a signing secret, and where Access is for this Worker
//   8. the deployed product is checked from outside
//
//   npm run deploy -- staging
//   npm run deploy -- production --confirm <the product's slug>
//
// It stops at the first step that fails. --skip-checks leaves out step 3 (use it only right
// after a passing `npm run check`).
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { inspect } from "./access.mjs";
import { plan } from "./config.mjs";
import { accountOf, cloudflareApi, hostOf, tokenFrom, wrangler } from "./lib/cloudflare.mjs";
import { loadProduct, ROOT, targetOf } from "./lib/product.mjs";
import { throughProxy } from "./lib/proxy.mjs";
import { applySecrets } from "./setup.mjs";
import { smoke } from "./smoke.mjs";

export function parseArgs(argv, slug) {
  const name = argv.find((arg) => !arg.startsWith("--"));
  const confirm = argv.includes("--confirm") ? argv[argv.indexOf("--confirm") + 1] : undefined;
  if (name === "production" && confirm !== slug) {
    throw new Error(
      `Going live needs the product's slug as a second key: npm run deploy -- production --confirm ${slug}`,
    );
  }
  return { name, skipChecks: argv.includes("--skip-checks") };
}

const step = (number, text) => console.log(`\n[${number}/8] ${text}`);
const npm = (args, env = {}) =>
  execFileSync("npm", args, { cwd: ROOT, stdio: "inherit", env: { ...process.env, ...env } });

async function main(argv) {
  const { product, edgePlan } = await loadProduct();
  const options = parseArgs(argv, product.slug);
  const target = targetOf(product, options.name);
  const cf = cloudflareApi(tokenFrom());
  const account = await accountOf(cf);
  const host = await hostOf(cf, account, target);
  console.log(`Deploying ${product.name} to ${target.name}: https://${host}`);

  step(1, "Files generated from the product config");
  const stale = [...plan(product)].filter(([file, wanted]) => readFileSync(file, "utf8") !== wanted);
  if (stale.length)
    throw new Error(
      `Out of step with product/product.config.ts: ${stale.map(([file]) => file.slice(ROOT.length + 1)).join(", ")}. Run npm run config:apply, commit, and deploy again.`,
    );

  step(2, "Cloudflare Access against the access map");
  const access = await inspect({ cf, account, product, rules: edgePlan(product.areas), host });
  if (!access.organization) {
    throw new Error(
      "This Cloudflare account has no Zero Trust organization yet, so nothing is deployed. Create one in the dashboard (Zero Trust, Free plan), then run npm run access:apply.",
    );
  }
  if (access.needsPeople || access.steps.length) {
    throw new Error(
      `Cloudflare Access does not match the access map, so nothing is deployed. Run: npm run access:apply -- ${target.name} --email <who may sign in>`,
    );
  }

  step(3, options.skipChecks ? "Checks skipped" : "Lint, types and tests");
  if (!options.skipChecks) npm(["run", "check"]);

  step(4, "Build");
  npm(["run", "build"], target.wranglerEnv ? { CLOUDFLARE_ENV: target.wranglerEnv } : {});

  step(5, "Database");
  const found = await cf(`/accounts/${account}/d1/database?name=${encodeURIComponent(target.database)}`);
  if (!found.some((database) => database.name === target.database)) {
    await cf(`/accounts/${account}/d1/database`, { method: "POST", body: { name: target.database } });
    console.log(`Created ${target.database}.`);
  }
  wrangler(
    [
      "d1",
      "migrations",
      "apply",
      "DB",
      "--remote",
      "--config",
      "wrangler.jsonc",
      ...(target.wranglerEnv ? ["--env", target.wranglerEnv] : []),
    ],
    { account },
  );

  step(6, "Worker");
  // The build wrote the configuration for this environment; wrangler picks it up from apps/web.
  wrangler(["deploy"], { account });

  step(7, "Secrets");
  const { set } = applySecrets(target, account, {
    ACCESS_TEAM_DOMAIN: access.organization,
    ACCESS_AUD: access.existing.protect?.aud ?? "",
  });
  console.log(`Stored: ${set.join(", ")}.`);

  step(8, "The deployed product, from outside");
  // Secrets take a moment to reach every location.
  await new Promise((done) => setTimeout(done, 5000));
  const rows = await smoke(`https://${host}`, product);
  for (const row of rows) console.log(`  ${row.ok ? "ok  " : "FAIL"} ${row.what.padEnd(42)} ${row.saw}`);
  if (rows.some((row) => !row.ok))
    throw new Error(
      `Deployed, but the check from outside failed. Look at https://${host}/health and run npm run smoke -- ${target.name} again in a minute.`,
    );
  console.log(`\n${product.name} is deployed to ${target.name}: https://${host}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  throughProxy();
  main(process.argv.slice(2)).catch((error) => {
    console.error(`\n${error.message}`);
    process.exit(1);
  });
}
