// What the native app needs from the Worker, proven on the Workers runtime: sign-in from an
// app (which has no web origin), the minimum version, and the files that make links open the app.
import { appLinks, type Env } from "@app/backend";
import { beforeAll, describe, expect, it } from "vitest";
import { Browser, env, mailedCode, migrate } from "./harness";
import { PRODUCTS } from "./products";

beforeAll(migrate);

const APP_ORIGIN = "testproduct://";

/** A request as the native app sends it: no Origin header, its URL scheme in `expo-origin`. */
const fromApp = (browser: Browser, path: string, body: unknown, scheme = APP_ORIGIN) =>
  browser.fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json", "expo-origin": scheme },
    body: JSON.stringify(body),
  });

describe("the native app", () => {
  it("signs in with an emailed code and then calls the API with its stored session", async () => {
    const app = new Browser({ product: "with-app" });
    const email = "phone@example.com";
    const sent = await fromApp(app, "/api/auth/email-otp/send-verification-otp", { email, type: "sign-in" });
    expect(sent.status, await sent.clone().text()).toBe(200);
    const signedIn = await fromApp(app, "/api/auth/sign-in/email-otp", { email, otp: await mailedCode(email) });
    expect(signedIn.status, await signedIn.clone().text()).toBe(200);
    const me = await app.fetch("/rpc/account/whoami", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    expect(await me.json()).toMatchObject({ json: { email } });
  });

  it("is refused when it claims a scheme that is not this product's", async () => {
    const app = new Browser({ product: "with-app" });
    const response = await fromApp(
      app,
      "/api/auth/email-otp/send-verification-otp",
      { email: "x@example.com", type: "sign-in" },
      "evilapp://",
    );
    expect(response.status).toBe(403);
  });

  it("is not trusted by a product that has no app", async () => {
    const app = new Browser({ product: "public-product" });
    const response = await fromApp(app, "/api/auth/email-otp/send-verification-otp", {
      email: "y@example.com",
      type: "sign-in",
    });
    expect(response.status).toBe(403);
  });

  it("learns the oldest version the server accepts, and that a product without an app has none", async () => {
    expect(await (await new Browser({ product: "with-app" }).fetch("/health")).json()).toMatchObject({
      mobile: { minVersion: "1.2.0" },
    });
    expect(await (await new Browser({ product: "public-product" }).fetch("/health")).json()).toMatchObject({
      mobile: null,
    });
  });

  it("can start Google or Apple sign-in in the system browser only when those are on", async () => {
    const off = await new Browser({ product: "public-product" }).fetch(
      "/api/auth/expo-authorization-proxy?authorizationURL=x",
    );
    expect(off.status).toBe(404);
    const on = await new Browser({ product: "with-app" }).fetch(
      "/api/auth/expo-authorization-proxy?authorizationURL=x",
    );
    expect(on.status).not.toBe(404);
  });
});

describe("links that open the app", () => {
  const withApp: Env = { ...env, PRODUCT: PRODUCTS["with-app"], ANDROID_CERT_SHA256: "aa:bb:cc, DD:EE:FF" };

  it("serves Apple's file naming the team and bundle, for the signed-in product's paths only", async () => {
    const response = appLinks("/.well-known/apple-app-site-association", withApp);
    expect(response?.headers.get("content-type")).toContain("application/json");
    const file = (await response?.json()) as {
      applinks: { details: { appIDs: string[]; components: { "/": string }[] }[] };
    };
    expect(file.applinks.details[0]?.appIDs).toEqual(["TESTTEAM01.com.example.testproduct"]);
    expect(file.applinks.details[0]?.components.map((item) => item["/"])).toEqual(["/app", "/app/*"]);
  });

  it("serves Android's file naming the package and signing keys", async () => {
    const file = (await appLinks("/.well-known/assetlinks.json", withApp)?.json()) as {
      target: { package_name: string; sha256_cert_fingerprints: string[] };
    }[];
    expect(file[0]?.target).toMatchObject({
      package_name: "com.example.testproduct",
      sha256_cert_fingerprints: ["AA:BB:CC", "DD:EE:FF"],
    });
  });

  it("serves neither until the product has an app and its ids are set", () => {
    const noApp: Env = { ...env, PRODUCT: PRODUCTS["public-product"] };
    expect(appLinks("/.well-known/apple-app-site-association", noApp)).toBeNull();
    expect(appLinks("/.well-known/assetlinks.json", { ...withApp, ANDROID_CERT_SHA256: "" })).toBeNull();
    expect(appLinks("/.well-known/apple-app-site-association", { ...withApp, APPLE_TEAM_ID: undefined })).toBeNull();
    expect(appLinks("/.well-known/other", withApp)).toBeNull();
  });

  it("is reachable through the router as part of the public site", async () => {
    const response = await new Browser({ product: "with-app" }).fetch("/.well-known/apple-app-site-association");
    expect(response.status).toBe(200);
    expect(await response.text()).toContain("TESTTEAM01.com.example.testproduct");
  });
});
