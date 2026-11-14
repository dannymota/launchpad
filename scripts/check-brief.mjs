#!/usr/bin/env node
// The gate after /start: is there a brief the rest of the pipeline can build from, and has
// the product config stopped being the template's?
//
//   npm run check:brief
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadProduct, ROOT } from "./lib/product.mjs";

/** The sections a brief must have, each with something under it. */
export const SECTIONS = [
  "What it is",
  "Who it is for",
  "The main thing people do",
  "What it is not",
  "Surfaces",
  "Access",
  "Plans",
  "Voice",
  "Legal",
  "Open questions",
];

/** What is wrong with a brief's text, one line each. Empty means it will do. */
export function briefProblems(text) {
  const problems = [];
  if (!/^# \S/m.test(text)) problems.push("It has no title line (# Product name).");
  for (const section of SECTIONS) {
    const start = text.search(new RegExp(`^## ${section}\\s*$`, "m"));
    if (start < 0) {
      problems.push(`The "${section}" section is missing.`);
      continue;
    }
    const rest = text.slice(start).split("\n").slice(1).join("\n");
    const body = rest.split(/^## /m)[0].trim();
    if (!body || /^(tbd|todo|\.\.\.)$/i.test(body)) problems.push(`The "${section}" section is empty.`);
  }
  return problems;
}

/** What still says "template" in a product config. */
export function configProblems(product) {
  const problems = [];
  if (product.slug === "launchpad" || product.name === "Launchpad")
    problems.push("product.config.ts still has the template's name and slug.");
  if (!product.tagline.trim()) problems.push("product.config.ts has no tagline.");
  if (product.mobile?.bundleId.startsWith("com.example."))
    problems.push("product.config.ts still has the example bundle id for the app.");
  return problems;
}

async function main() {
  const file = join(ROOT, "product/brief.md");
  const problems = existsSync(file)
    ? briefProblems(readFileSync(file, "utf8"))
    : ["There is no product/brief.md. /start <idea> writes it."];
  problems.push(...configProblems((await loadProduct()).product));
  if (problems.length) {
    console.error(`The brief is not ready:\n${problems.map((problem) => `  - ${problem}`).join("\n")}`);
    process.exit(1);
  }
  console.log("The brief and the product config are ready to build from.");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
