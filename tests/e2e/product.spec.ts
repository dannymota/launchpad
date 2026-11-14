// The product in a real browser, as it is after launch: a stranger sees the public pages and
// nothing internal; a person signs in with an emailed code, reaches the app, and signs out.
// These run against the built Worker (scripts/e2e-server.mjs), not a dev server.
import { execFileSync } from "node:child_process";
import path from "node:path";
import { expect, type Page, test } from "@playwright/test";

const WEB = path.resolve(import.meta.dirname, "../../apps/web");

/** The newest sign-in code mailed to `email`, read from the local outbox. */
function mailedCode(email: string): string {
  const out = execFileSync(
    "npx",
    [
      "wrangler",
      "d1",
      "execute",
      "DB",
      "--local",
      "--persist-to",
      ".wrangler/e2e",
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

test("a stranger sees the site, and nothing internal", async ({ page, request }) => {
  // >>> site
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
  // <<< site

  // Labs and admin are behind Cloudflare Access in every setup. Without it they do not exist.
  for (const hidden of ["/labs", "/admin", "/api/admin/users"]) {
    expect((await request.get(hidden)).status(), hidden).toBe(404);
  }
  // The product asks for a sign-in; the API says so plainly.
  await page.goto("/app");
  await expect(page).toHaveURL(/\/sign-in\?next=%2Fapp$/);
  expect((await request.get("/api/account/whoami")).status()).toBe(401);
  expect((await request.get("/api/ping")).status()).toBe(200);
});

test("a person signs in with an emailed code, uses the app, and signs out", async ({ page }) => {
  const email = `e2e-${Date.now()}@example.com`;
  await page.goto("/app");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Send code" }).click();
  await expect(page.getByRole("heading", { name: "Enter your code" })).toBeVisible();

  await page.getByLabel("Code").fill(mailedCode(email));
  await page.getByLabel("Code").press("Enter");
  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByText(email)).toBeVisible();

  await page.goto("/settings");
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  await expect(page.getByText("This browser")).toBeVisible();

  // Signing out leaves the settings page by itself; then the app asks for a sign-in again.
  await page.getByRole("button", { name: "Sign out" }).first().click();
  await page.waitForURL((url) => !url.pathname.startsWith("/settings"));
  await page.goto("/app");
  await expect(page).toHaveURL(/\/sign-in/);
});

test("a wrong code is refused, and pages carry the security headers", async ({ page }) => {
  const email = `e2e-wrong-${Date.now()}@example.com`;
  const response = await page.goto("/sign-in");
  const policy = response?.headers()["content-security-policy"] ?? "";
  expect(policy).toContain("default-src 'self'");
  expect(policy).toMatch(/script-src 'self' 'nonce-[^']+'/);
  expect(response?.headers()["x-frame-options"]).toBe("DENY");

  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Send code" }).click();
  await expect(page.getByRole("heading", { name: "Enter your code" })).toBeVisible();
  const real = mailedCode(email);
  await page.getByLabel("Code").fill(real === "000000" ? "111111" : "000000");
  await page.getByLabel("Code").press("Enter");
  // The message appears on the field (and is announced to screen readers).
  await expect(page.getByText("That code didn't work").first()).toBeVisible();
  await expect(page).toHaveURL(/\/sign-in/);
});

// A slow connection: the sign-in form is on screen, and can be typed into, seconds before its
// scripts arrive. Both tests below hold the scripts back to make that happen every time.
async function slowScripts(page: Page, ms: number) {
  await page.route("**/*.js", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, ms));
    await route.continue();
  });
}

test("an address typed before the page has finished loading is still used", async ({ page }) => {
  await slowScripts(page, 1500);
  const email = `e2e-early-${Date.now()}@example.com`;
  await page.goto("/sign-in", { waitUntil: "commit" });
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Send code" }).click();
  await expect(page.getByRole("heading", { name: "Enter your code" })).toBeVisible();
  await expect(page.getByText(email)).toBeVisible();
});

test("Enter pressed before the page has finished loading keeps where the person was going", async ({ page }) => {
  await slowScripts(page, 1500);
  await page.goto("/sign-in?next=%2Fsettings", { waitUntil: "commit" });
  await page.getByLabel("Email").fill("too-early@example.com");
  // The browser submits the form by itself: the page reloads, and must not forget the destination.
  await page.getByLabel("Email").press("Enter");
  await expect(page).toHaveURL(/\/sign-in\?next=%2Fsettings$/);
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
});
