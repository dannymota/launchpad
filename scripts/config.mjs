#!/usr/bin/env node
// Carries product/product.config.ts into the few files that cannot read it when they run:
// the Worker's name, its databases and domain in apps/web/wrangler.jsonc, the root package
// name (and the lockfile's copy of it), the price setting each paid plan needs in
// apps/web/.dev.vars.example, and the app's title in both store listings.
//
//   npm run config:apply   write what the config says
//   npm run config:check   change nothing; fail when a file is out of step
//
// Everything else (pages, emails, sign-in, the app, the MCP server) reads the config itself.
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadProduct, ROOT } from "./lib/product.mjs";

const MAIL_BINDING = '"send_email": [{ "name": "EMAIL" }],';

/** apps/web/wrangler.jsonc with the product's names, domain and mail binding. Comments are kept. */
export function wranglerFor(text, product) {
  const { slug, domains } = product;
  let staging = false;
  const out = [];
  for (const line of text.split("\n")) {
    const indent = /^\s*/.exec(line)[0];
    if (/^\s*"staging":\s*\{/.test(line)) staging = true;
    // The mail binding and the domain are written again below, where they belong.
    if (/^\s*"send_email":/.test(line) || /^\s*"routes":/.test(line)) continue;
    if (/^\s*"name":/.test(line)) {
      out.push(`${indent}"name": "${staging ? `${slug}-staging` : slug}",`);
      // The product's own domain, on the live Worker only. Staging keeps its workers.dev address.
      if (!staging && domains.app)
        out.push(`${indent}"routes": [{ "pattern": "${domains.app}", "custom_domain": true }],`);
      continue;
    }
    if (/^\s*"database_name":/.test(line)) {
      out.push(`${indent}"database_name": "${staging ? `${slug}-staging-db` : `${slug}-db`}",`);
      continue;
    }
    // Mail needs a sending domain on Cloudflare. Without one the binding is left out, so a
    // product with no domain yet still deploys.
    if (/^\s*"version_metadata":/.test(line) && domains.email) out.push(indent + MAIL_BINDING);
    out.push(line);
  }
  return out.join("\n");
}

/** A file's text with one JSON string value replaced wherever `key` appears, layout untouched. */
const withValue = (file, key, value, all = false) =>
  readFileSync(file, "utf8").replace(
    new RegExp(`("${key}":\\s*)"[^"]*"`, all ? "g" : ""),
    `$1${JSON.stringify(value)}`,
  );

/** package-lock.json with the root package's name, which it holds twice (the first two "name" keys). */
export function lockFor(text, slug) {
  let left = 2;
  return text.replace(/("name":\s*)"[^"]*"/g, (found, key) => (left-- > 0 ? `${key}${JSON.stringify(slug)}` : found));
}

/** The Worker variable that holds a paid plan's Stripe price (packages/backend/src/modules/payments/plans.ts). */
const priceSetting = (planId) => `STRIPE_PRICE_${planId.toUpperCase().replaceAll("-", "_")}`;

/**
 * apps/web/.dev.vars.example with one commented price line per paid plan, in place of
 * whatever price lines it had. A file with none (payments removed) is left as it is.
 */
export function devVarsExampleFor(text, product) {
  const lines = text.split("\n");
  const isPrice = (line) => /^#?\s*STRIPE_PRICE_[A-Z0-9_]+=/.test(line);
  const first = lines.findIndex(isPrice);
  if (first < 0) return text;
  const wanted = (product.plans ?? []).filter((plan) => plan.paid).map((plan) => `# ${priceSetting(plan.id)}=`);
  const kept = lines.filter((line) => !isPrice(line));
  kept.splice(first, 0, ...wanted);
  return kept.join("\n");
}

/** Each file this script owns a part of, with what it should hold. */
export function plan(product, root = ROOT) {
  const files = new Map();
  const wrangler = join(root, "apps/web/wrangler.jsonc");
  files.set(wrangler, wranglerFor(readFileSync(wrangler, "utf8"), product));
  const manifest = join(root, "package.json");
  // The first "name" in package.json is the package's own.
  files.set(manifest, withValue(manifest, "name", product.slug));
  const lock = join(root, "package-lock.json");
  if (existsSync(lock)) files.set(lock, lockFor(readFileSync(lock, "utf8"), product.slug));
  const example = join(root, "apps/web/.dev.vars.example");
  if (existsSync(example)) files.set(example, devVarsExampleFor(readFileSync(example, "utf8"), product));
  const listing = join(root, "apps/mobile/store.config.json");
  if (existsSync(listing)) files.set(listing, withValue(listing, "title", product.name, true));
  // Google Play's title is a text file per language.
  const play = join(root, "apps/mobile/store/android/listing");
  if (existsSync(play)) {
    for (const entry of readdirSync(play, { withFileTypes: true })) {
      const title = join(play, entry.name, "title.txt");
      if (entry.isDirectory() && existsSync(title)) files.set(title, `${product.name}\n`);
    }
  }
  return files;
}

async function main() {
  const check = process.argv.includes("--check");
  const { product } = await loadProduct();
  const stale = [...plan(product)].filter(([file, wanted]) => readFileSync(file, "utf8") !== wanted);
  if (stale.length === 0) return console.log("Every file agrees with product/product.config.ts.");
  for (const [file, wanted] of stale) {
    console.log(`${check ? "out of step" : "updated"}  ${file.slice(ROOT.length + 1)}`);
    if (!check) writeFileSync(file, wanted);
  }
  if (check) {
    console.error("\nRun `npm run config:apply`.");
    process.exit(1);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
