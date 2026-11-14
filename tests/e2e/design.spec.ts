// The design detector (Impeccable) on the product's pages as a browser draws them: contrast,
// text size, heading order, overflow, and the usual tells of a generated page. It reads the
// page Playwright has open, so signed-in pages are covered too. Rules: `npx impeccable detect
// --list-rules`. An exception goes in .impeccable/config.json with a reason, never here.
import { spawnSync } from "node:child_process";
import path from "node:path";
import { expect, type Page, test } from "@playwright/test";
import { mailedCode } from "./outbox";

const ROOT = path.resolve(import.meta.dirname, "../..");
/**
 * The detector attaches to the browser through this port. It differs from run to run, so a
 * browser left behind by a run that was killed is never the one that gets scanned.
 */
const DEVTOOLS_PORT = 9400 + (process.pid % 500);

test.use({
  launchOptions: { args: [`--remote-debugging-port=${DEVTOOLS_PORT}`] },
  contextOptions: { reducedMotion: "reduce" },
});
// Each page is scanned twice, and each scan starts a program: give that room.
test.describe.configure({ timeout: 180_000 });

/** How each page is looked at. Dark is checked at one size: it changes colours, not layout. */
const VIEWS = [
  { name: "desktop", width: 1280, height: 800, scheme: "light" },
  { name: "phone", width: 390, height: 844, scheme: "light" },
  { name: "desktop, dark", width: 1280, height: 800, scheme: "dark" },
] as const;

interface Finding {
  antipattern: string;
  snippet?: string;
}

/**
 * What the detector finds on the page as it is shown now, one line per finding. `target` picks
 * the page by a part of its address or title.
 */
function findingsOn(target: string): string[] {
  const run = spawnSync(
    "npx",
    ["impeccable", "detect", "--json", "--no-advisory", "--cdp", String(DEVTOOLS_PORT), "--target", target],
    {
      cwd: ROOT,
      encoding: "utf8",
      // The call blocks this process, so Playwright's own time limit cannot end it.
      timeout: 60_000,
      env: { ...process.env, IMPECCABLE_NO_UPDATE_CHECK: "1", IMPECCABLE_NO_TELEMETRY: "1" },
    },
  );
  // 0 is clean and 2 is findings. Anything else means the page was not scanned at all.
  if (run.status !== 0 && run.status !== 2) {
    throw new Error(
      `The detector could not scan ${target} (${run.error?.message ?? `exit ${run.status}`}):\n${run.stderr}`,
    );
  }
  // A scan that worked but had something to say (a rule it could not run, for one).
  if (run.stderr.trim()) console.warn(`Detector, on ${target}: ${run.stderr.trim()}`);
  return (JSON.parse(run.stdout) as Finding[]).map((found) => `${found.antipattern}: ${found.snippet ?? ""}`.trim());
}

/** The detector's findings on `page` in each view, with the page put back as it was. */
async function findingsByView(page: Page, target = page.url()): Promise<Record<string, string[]>> {
  const before = page.viewportSize();
  const found: Record<string, string[]> = {};
  for (const view of VIEWS) {
    await page.setViewportSize({ width: view.width, height: view.height });
    await page.emulateMedia({ colorScheme: view.scheme });
    found[view.name] = findingsOn(target);
  }
  await page.emulateMedia({ colorScheme: "light" });
  if (before) await page.setViewportSize(before);
  return found;
}

/**
 * Heading levels in page order, as a screen reader hears them. Astryx sizes a heading by one
 * level and can place it in the outline at another (`accessibilityLevel`, written as
 * aria-level); the detector reads tag names only, so the outline is checked here instead.
 */
async function outlineOf(page: Page): Promise<number[]> {
  return page
    .locator("h1, h2, h3, h4, h5, h6")
    .evaluateAll((headings) =>
      headings
        .filter((heading) => heading.getClientRects().length > 0)
        .map((heading) => Number(heading.getAttribute("aria-level") ?? heading.tagName.slice(1))),
    );
}

async function expectClean(page: Page, where: string) {
  for (const [view, found] of Object.entries(await findingsByView(page))) {
    const real = found.filter((finding) => !finding.startsWith("skipped-heading"));
    expect(real, `${where} (${view})`).toEqual([]);
  }
  const outline = await outlineOf(page);
  const skips = outline.filter((level, index) => level > (outline[index - 1] ?? 0) + 1);
  expect(skips, `${where}: heading levels ${outline.join(", ")} skip a level`).toEqual([]);
}

test("the detector sees this browser, at the size and in the colours the test sets", async ({ page }) => {
  // A page that is wrong on purpose. If this stops failing the detector, a clean result on the
  // real pages below means nothing. The second paragraph is sized by the window: readable on a
  // desktop, far too small on a phone. The third is readable in light and too faint in dark.
  await page.setContent(`<!doctype html><html lang="en"><head><title>design-canary</title>
    <style>:root { color-scheme: light dark }</style></head>
    <body style="margin:40px;background:light-dark(#ffffff,#222222);font-family:sans-serif">
      <h1 style="color:light-dark(#111111,#eeeeee)">Canary</h1>
      <p style="font-size:16px;color:#9a9a9a">Mid grey text that fails contrast on white and on near-black.</p>
      <p style="font-size:2vw;color:light-dark(#111111,#eeeeee)">Text sized by the width of the window.</p>
      <p style="font-size:16px;color:light-dark(#111111,#3a3a3a)">Text that only the dark colours make too faint.</p>
    </body></html>`);
  const found = await findingsByView(page, "design-canary");
  const rules = (view: string) => found[view].map((finding) => finding.split(":")[0]);
  for (const view of Object.keys(found)) expect(rules(view), view).toContain("low-contrast");
  expect(rules("phone")).toContain("tiny-text");
  expect(rules("desktop")).not.toContain("tiny-text");
  // The faint dark text is reported with its colour, and only when the page is shown in dark.
  expect(found["desktop, dark"].join("\n")).toContain("#3a3a3a");
  expect(found.desktop.join("\n")).not.toContain("#3a3a3a");
});

test("the pages a stranger sees pass the design detector", async ({ page }) => {
  // >>> site
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expectClean(page, "The home page");
  // <<< site

  await page.goto("/sign-in");
  await expect(page.getByRole("button", { name: "Send code" })).toBeVisible();
  await expectClean(page, "The sign-in page");
});

test("the signed-in pages pass the design detector", async ({ page }) => {
  const email = `e2e-design-${Date.now()}@example.com`;
  await page.goto("/app");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Send code" }).click();
  await expect(page.getByRole("heading", { name: "Enter your code" })).toBeVisible();
  await expectClean(page, "The code step of sign-in");

  await page.getByLabel("Code").fill(mailedCode(email));
  await page.getByLabel("Code").press("Enter");
  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByText(email)).toBeVisible();
  await expectClean(page, "The app's first page");

  // New features go above this line: `npm run new:feature` adds them here.
  await page.goto("/settings");
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  await expectClean(page, "Settings");
});
