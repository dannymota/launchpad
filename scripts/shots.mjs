#!/usr/bin/env node
// Pictures of the product as a person sees it after launch: the public pages, sign-in, and
// the signed-in pages, in light and dark, at desktop and phone width. For looking at a
// change to the brand or a new page before saying it is done.
//
//   npm run build && npm run shots                      the main pages, into shots/
//   npm run shots -- /app/notes /pricing                those pages as well
//   npm run shots -- --only /app/notes                  only the pages named
//   npm run shots -- --out /some/folder --scale 2       another folder; sharper, larger files
//
// It runs its own copy of the built Worker with an empty database (scripts/e2e-server.mjs) and
// signs in with an emailed code read from the local outbox, as the browser tests do.
import { execFileSync, spawn } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const ROOT = resolve(fileURLToPath(import.meta.url), "../..");
const WEB = join(ROOT, "apps/web");
const PORT = 8791;
const STATE = ".wrangler/shots";
const ORIGIN = `http://127.0.0.1:${PORT}`;

const SIZES = { desktop: { width: 1280, height: 800 }, phone: { width: 390, height: 844 } };
const SCHEMES = ["light", "dark"];

export function parseArgs(argv) {
  const value = (flag) => (argv.includes(flag) ? argv[argv.indexOf(flag) + 1] : undefined);
  const paths = argv.filter(
    (arg, index) => arg.startsWith("/") && argv[index - 1] !== "--out" && argv[index - 1] !== "--scale",
  );
  return {
    out: resolve(value("--out") ?? join(ROOT, "shots")),
    scale: Number(value("--scale")) || 1,
    only: argv.includes("--only"),
    paths,
  };
}

/** A file name for a page: "/" → "home", "/app/notes" → "app-notes". */
export const nameOf = (path) => path.replace(/^\/|\/$/g, "").replaceAll("/", "-") || "home";

/** The newest sign-in code mailed to `email`, from this run's local outbox. */
function mailedCode(email) {
  const out = execFileSync(
    "npx",
    [
      "wrangler",
      "d1",
      "execute",
      "DB",
      "--local",
      "--persist-to",
      STATE,
      "--json",
      "--command",
      `select subject from email_outbox where recipient = '${email}' order by id desc limit 1`,
    ],
    { cwd: WEB, encoding: "utf8", env: { ...process.env, CI: "1" } },
  );
  const code = /\d{6}/.exec(out.slice(out.indexOf("[")))?.[0];
  if (!code) throw new Error(`No sign-in code was mailed to ${email}.`);
  return code;
}

async function answers() {
  try {
    return (await fetch(`${ORIGIN}/health`)).ok;
  } catch {
    return false;
  }
}

async function ready() {
  for (let tries = 0; tries < 120; tries++) {
    if (await answers()) return;
    await new Promise((done) => setTimeout(done, 500));
  }
  throw new Error("The product did not start. Run `npm run build` first.");
}

async function main(argv) {
  const options = parseArgs(argv);
  if (!existsSync(join(WEB, "dist/server/wrangler.json"))) {
    throw new Error("There is no build to look at. Run `npm run build` first.");
  }
  // A server left on the port would be an older build: its pages would not match the files on disk.
  if (await answers()) throw new Error(`Something is already serving on port ${PORT}. Stop it, then run this again.`);
  mkdirSync(options.out, { recursive: true });
  // In a group of its own, so stopping it also stops the Worker runtime it starts.
  const server = spawn("node", [join(ROOT, "scripts/e2e-server.mjs")], {
    cwd: ROOT,
    stdio: "ignore",
    detached: true,
    env: { ...process.env, PRODUCT_PORT: String(PORT), PRODUCT_STATE: STATE },
  });
  const stop = () => {
    try {
      process.kill(-server.pid, "SIGTERM");
    } catch {}
  };
  process.on("SIGINT", () => {
    stop();
    process.exit(130);
  });
  const browser = await chromium.launch();
  const saved = [];
  try {
    await ready();
    const context = await browser.newContext({ deviceScaleFactor: options.scale, reducedMotion: "reduce" });
    const page = await context.newPage();
    /** One page, as it is shown now, in every size and colour scheme. */
    const shoot = async (name) => {
      for (const [size, viewport] of Object.entries(SIZES)) {
        for (const scheme of SCHEMES) {
          await page.setViewportSize(viewport);
          await page.emulateMedia({ colorScheme: scheme });
          const file = join(options.out, `${name}-${size}-${scheme}.png`);
          await page.screenshot({ path: file, fullPage: true });
          saved.push(file);
        }
      }
    };
    const visit = async (path) => {
      const response = await page.goto(`${ORIGIN}${path}`, { waitUntil: "networkidle" });
      if (!response || response.status() >= 400) {
        console.error(`  ${path} answered ${response?.status() ?? "nothing"}: skipped`);
        return;
      }
      await shoot(
        nameOf(new URL(page.url()).pathname === "/sign-in" && path !== "/sign-in" ? `${path}-signed-out` : path),
      );
    };

    // Signed out: the public pages. A product with no public site sends "/" on to sign-in.
    const signedOut = options.only ? [] : ["/", "/sign-in"];
    for (const path of signedOut) await visit(path);

    // Sign in, with a picture of the code step on the way.
    const email = `shots-${Date.now()}@example.com`;
    await page.goto(`${ORIGIN}/sign-in`, { waitUntil: "networkidle" });
    await page.getByLabel("Email").fill(email);
    await page.getByRole("button", { name: "Send code" }).click();
    await page.getByLabel("Code").waitFor();
    if (!options.only) await shoot("sign-in-code");
    await page.getByLabel("Code").fill(mailedCode(email));
    await page.getByLabel("Code").press("Enter");
    await page.waitForURL(/\/app$/);

    const signedIn = options.only ? options.paths : ["/app", "/settings", ...options.paths];
    for (const path of signedIn) await visit(path);
  } finally {
    await browser.close();
    stop();
  }
  console.log(`${saved.length} pictures in ${options.out}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
