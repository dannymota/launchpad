// The design detector (Impeccable) on the product's pages as a browser draws them: contrast,
// text size, heading order, overflow, and the usual tells of a generated page. It reads the
// page Playwright has open, so signed-in pages are covered too. Rules: `npx impeccable detect
// --list-rules`. An exception goes in .impeccable/config.json with a reason, never here.
import { spawnSync } from "node:child_process";
import path from "node:path";
import { expect, type Page, test } from "@playwright/test";
import { mailedCode } from "./outbox";

const ROOT = path.resolve(import.meta.dirname, "../..");
/** The detector attaches to the browser through this port. */
const DEVTOOLS_PORT = 9343;

test.use({ launchOptions: { args: [`--remote-debugging-port=${DEVTOOLS_PORT}`] } });

const SIZES = [
  { name: "desktop", width: 1280, height: 800 },
  { name: "phone", width: 390, height: 844 },
];

interface Finding {
  antipattern: string;
  snippet?: string;
}

/** What the detector finds on the page as it is shown now, one line per finding. */
function findingsOn(page: Page): string[] {
  const run = spawnSync(
    "npx",
    ["impeccable", "detect", "--json", "--no-advisory", "--cdp", String(DEVTOOLS_PORT), "--target", page.url()],
    {
      cwd: ROOT,
      encoding: "utf8",
      env: { ...process.env, IMPECCABLE_NO_UPDATE_CHECK: "1", IMPECCABLE_NO_TELEMETRY: "1" },
    },
  );
  // 0 is clean and 2 is findings. Anything else means the page was not scanned at all.
  if (run.status !== 0 && run.status !== 2)
    throw new Error(`The detector could not scan ${page.url()}:\n${run.stderr}`);
  return (JSON.parse(run.stdout) as Finding[]).map((found) => `${found.antipattern}: ${found.snippet ?? ""}`.trim());
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
  for (const size of SIZES) {
    await page.setViewportSize(size);
    const found = findingsOn(page).filter((finding) => !finding.startsWith("skipped-heading"));
    expect(found, `${where} at ${size.name} width`).toEqual([]);
  }
  const outline = await outlineOf(page);
  const skips = outline.filter((level, index) => level > (outline[index - 1] ?? 0) + 1);
  expect(skips, `${where}: heading levels ${outline.join(", ")} skip a level`).toEqual([]);
}

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
