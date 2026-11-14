#!/usr/bin/env node
// Takes staging down: the Worker, the database and key-value store that belong to it, and
// its Cloudflare Access applications. For a staging that was only a rehearsal, or one you
// want to rebuild from nothing. Everything in it is deleted for good.
//
//   npm run teardown -- staging                      show what would be deleted. Changes nothing.
//   npm run teardown -- staging --confirm <worker>   delete it. <worker> is the staging Worker's name.
//
// Production is never taken down from here: do that by hand, in the Cloudflare dashboard.
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ours } from "./access.mjs";
import { accountOf, CloudflareError, cloudflareApi, hostOf, tokenFrom } from "./lib/cloudflare.mjs";
import { loadProduct, targetOf } from "./lib/product.mjs";
import { throughProxy } from "./lib/proxy.mjs";

export function parseArgs(argv) {
  const name = argv.find((arg, index) => !arg.startsWith("--") && argv[index - 1] !== "--confirm");
  if (name === "production") {
    throw new Error(
      "Production is not taken down by a script. Delete it by hand in the Cloudflare dashboard if you mean to.",
    );
  }
  if (name !== "staging") throw new Error("Say what to take down: staging.");
  return { name, confirm: argv.includes("--confirm") ? argv[argv.indexOf("--confirm") + 1] : undefined };
}

const missing = (error) => error instanceof CloudflareError && error.status === 404;

/**
 * What exists for this target and would be deleted, in the order it must go: the Worker
 * first, so that nothing is still bound to the stores when they are removed.
 */
export async function teardownSteps({ cf, account, product, target, host }) {
  const base = `/accounts/${account}`;
  const steps = [];

  const settings = await cf(`${base}/workers/scripts/${target.worker}/settings`).catch((error) => {
    if (missing(error)) return null;
    throw error;
  });
  if (settings)
    steps.push({ what: `Worker ${target.worker}`, path: `${base}/workers/scripts/${target.worker}?force=true` });

  // Only a key-value store made for this Worker: bound to it, and named after it.
  const stores = (settings?.bindings ?? []).filter((binding) => binding.type === "kv_namespace");
  if (stores.length) {
    const all = await cf(`${base}/storage/kv/namespaces?per_page=100`);
    for (const store of stores) {
      const title = all.find((namespace) => namespace.id === store.namespace_id)?.title ?? "";
      if (title.startsWith(target.worker)) {
        steps.push({ what: `Key-value store ${title}`, path: `${base}/storage/kv/namespaces/${store.namespace_id}` });
      } else {
        steps.push({
          what: `Key-value store ${title || store.namespace_id} is bound to the Worker but not named after it`,
          skip: true,
        });
      }
    }
  }

  const databases = await cf(`${base}/d1/database?name=${encodeURIComponent(target.database)}`);
  const database = databases.find((item) => item.name === target.database);
  if (database) steps.push({ what: `Database ${target.database}`, path: `${base}/d1/database/${database.uuid}` });

  const apps = ours((await cf(`${base}/access/apps`)) ?? [], product, host);
  for (const app of [apps.protect, apps.bypass]) {
    if (app) steps.push({ what: `Access application "${app.name}" on ${host}`, path: `${base}/access/apps/${app.id}` });
  }
  return steps;
}

async function main(argv) {
  const options = parseArgs(argv);
  const { product } = await loadProduct();
  const target = targetOf(product, options.name);
  const cf = cloudflareApi(tokenFrom());
  const account = await accountOf(cf);
  const host = await hostOf(cf, account, target);
  const steps = await teardownSteps({ cf, account, product, target, host });

  if (steps.length === 0) return console.log(`Nothing of ${target.worker} exists on this account.`);
  console.log(`${product.name}, ${target.name} (${host}):`);
  for (const step of steps) console.log(`  ${step.skip ? "leave  " : "delete "} ${step.what}`);
  if (options.confirm !== target.worker) {
    return console.log(
      `\nNothing was deleted. To delete these for good: npm run teardown -- ${target.name} --confirm ${target.worker}`,
    );
  }
  console.log("");
  for (const step of steps) {
    if (step.skip) continue;
    await cf(step.path, { method: "DELETE" });
    console.log(`  deleted ${step.what}`);
  }
  console.log(`\n${target.name} is gone. A new deploy starts it again from nothing.`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  throughProxy();
  main(process.argv.slice(2)).catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
