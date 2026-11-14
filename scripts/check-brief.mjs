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

/** The template's own tagline: a product that still has it has not been given one. */
const TEMPLATE_TAGLINE = "A starting point with sign-in, an API and an assistant connection already working.";

/** What still says "template" in a product config. */
export function configProblems(product) {
  const problems = [];
  if (product.slug === "launchpad" || product.name === "Launchpad")
    problems.push("product.config.ts still has the template's name and slug.");
  if (!product.tagline.trim()) problems.push("product.config.ts has no tagline.");
  if (product.tagline.trim() === TEMPLATE_TAGLINE) problems.push("product.config.ts still has the template's tagline.");
  if (product.mobile?.bundleId.startsWith("com.example."))
    problems.push("product.config.ts still has the example bundle id for the app.");
  return problems;
}

/** Where the brief and the config say different things about the same fact. */
export function mismatches(text, product) {
  const problems = [];
  const title = /^# (.+)$/m.exec(text)?.[1].trim();
  if (title && title !== product.name)
    problems.push(`The brief is titled "${title}" but product.config.ts names the product "${product.name}".`);
  const plans = text.split(/^## Plans\s*$/m)[1]?.split(/^## /m)[0] ?? "";
  for (const plan of product.plans ?? []) {
    if (!plans.toLowerCase().includes(plan.name.toLowerCase()))
      problems.push(
        `product.config.ts has a plan called "${plan.name}" that the brief's Plans section does not mention.`,
      );
  }
  return problems;
}

async function main() {
  const file = join(ROOT, "product/brief.md");
  const { product } = await loadProduct();
  const problems = existsSync(file)
    ? [...briefProblems(readFileSync(file, "utf8")), ...mismatches(readFileSync(file, "utf8"), product)]
    : ["There is no product/brief.md. /start <idea> writes it."];
  problems.push(...configProblems(product));
  // The two documents a newcomer opens first still open with the template's name.
  for (const name of ["README.md", "AGENTS.md"]) {
    const doc = join(ROOT, name);
    if (product.name !== "Launchpad" && existsSync(doc) && /^# Launchpad\s*$/m.test(readFileSync(doc, "utf8")))
      problems.push(`${name} still describes the template: /start rewrites its title and opening for the product.`);
  }
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
