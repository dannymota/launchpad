#!/usr/bin/env node
// The gate after /listing: every store field is filled in and inside the store's limit,
// and nothing still holds the template's placeholder.
//
//   npm run check:listing
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ROOT } from "./lib/product.mjs";

/** Character limits. App Store Connect and Google Play both count characters, not bytes. */
export const LIMITS = {
  apple: { title: 30, subtitle: 30, promoText: 170, description: 4000, keywords: 100 },
  google: { title: 30, shortDescription: 80, fullDescription: 4000 },
};
const PLACEHOLDER = /replace this|replace these|replaces this|example\.com|a starting point/i;
const length = (value) => [...String(value)].length;

export function listingProblems(apple, google) {
  const problems = [];
  const check = (store, where, fields, limits, required) => {
    for (const field of required) {
      const value = Array.isArray(fields?.[field]) ? fields[field].join(",") : fields?.[field];
      if (!value || !String(value).trim()) problems.push(`${store} ${where}: ${field} is empty.`);
      else if (PLACEHOLDER.test(String(value)))
        problems.push(`${store} ${where}: ${field} still has placeholder text.`);
      else if (limits[field] && length(value) > limits[field])
        problems.push(`${store} ${where}: ${field} is ${length(value)} characters; the limit is ${limits[field]}.`);
    }
  };
  for (const [locale, fields] of Object.entries(apple?.apple?.info ?? {})) {
    check("App Store", locale, fields, LIMITS.apple, [
      "title",
      "subtitle",
      "description",
      "keywords",
      "supportUrl",
      "privacyPolicyUrl",
    ]);
    if (fields.promoText) check("App Store", locale, fields, LIMITS.apple, ["promoText"]);
  }
  if (!Object.keys(apple?.apple?.info ?? {}).length) problems.push("App Store: store.config.json has no listing.");
  for (const [locale, fields] of Object.entries(google ?? {})) {
    check("Google Play", locale, fields, LIMITS.google, ["title", "shortDescription", "fullDescription"]);
  }
  if (!Object.keys(google ?? {}).length) problems.push("Google Play: store/android/listing has no listing.");
  return problems;
}

/** Google Play's listing, read from store/android/listing/<locale>/*.txt (the layout fastlane and the Play Console use). */
export function playListing(mobile) {
  const root = join(mobile, "store/android/listing");
  if (!existsSync(root)) return {};
  const text = (locale, name) => {
    const file = join(root, locale, `${name}.txt`);
    return existsSync(file) ? readFileSync(file, "utf8").trim() : "";
  };
  return Object.fromEntries(
    readdirSync(root, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => [
        entry.name,
        {
          title: text(entry.name, "title"),
          shortDescription: text(entry.name, "short_description"),
          fullDescription: text(entry.name, "full_description"),
        },
      ]),
  );
}

function main() {
  const mobile = join(ROOT, "apps/mobile");
  if (!existsSync(mobile)) return console.log("This product has no mobile app, so there is no listing to check.");
  const config = join(mobile, "store.config.json");
  const apple = existsSync(config) ? JSON.parse(readFileSync(config, "utf8")) : null;
  const problems = listingProblems(apple, playListing(mobile));
  if (problems.length) {
    console.error(`The store listings are not ready:\n${problems.map((problem) => `  - ${problem}`).join("\n")}`);
    process.exit(1);
  }
  console.log("Both store listings are filled in and inside their limits.");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
