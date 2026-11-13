import { generateKeyPairSync } from "node:crypto";
import { decodeProtectedHeader, importSPKI, jwtVerify } from "jose";
import { describe, expect, it } from "vitest";
import { appleClientSecret } from "../src/core/apple-secret";
import { isCrossSiteAuthCallback, isCrossSiteWrite } from "../src/safety/cross-site";
import { clientAddress, clientNetwork } from "../src/safety/limits";
import { signUpAllowed } from "../src/safety/signup-gate";

describe("signUpAllowed", () => {
  const lists = { allowlist: ["invited@example.com"], domains: ["corp.example"] };

  it("follows the mode", () => {
    expect(signUpAllowed("open", "anyone@anywhere.example", lists)).toBe(true);
    expect(signUpAllowed("closed", "invited@example.com", lists)).toBe(false);
    expect(signUpAllowed("allowlist", "invited@example.com", lists)).toBe(true);
    expect(signUpAllowed("allowlist", "other@example.com", lists)).toBe(false);
    expect(signUpAllowed("domain", "a@corp.example", lists)).toBe(true);
    expect(signUpAllowed("domain", "a@example.com", lists)).toBe(false);
  });

  it("ignores case and surrounding space", () => {
    expect(signUpAllowed("allowlist", "  Invited@Example.COM ", lists)).toBe(true);
    expect(signUpAllowed("domain", "A@CORP.EXAMPLE", lists)).toBe(true);
  });

  it("matches the domain after the last @, not a lookalike", () => {
    expect(signUpAllowed("domain", "a@corp.example.evil.example", lists)).toBe(false);
    expect(signUpAllowed("domain", "a@evil.example@corp.example", lists)).toBe(true);
    expect(signUpAllowed("domain", "corp.example", lists)).toBe(false);
    expect(signUpAllowed("domain", "a@notcorp.example", lists)).toBe(false);
  });

  it("refuses something that is not an address in every mode", () => {
    expect(signUpAllowed("open", "not-an-address", lists)).toBe(false);
    expect(signUpAllowed("open", "trailing@", lists)).toBe(false);
  });
});

describe("client address", () => {
  const from = (ip?: string) => new Request("https://x.example", { headers: ip ? { "cf-connecting-ip": ip } : {} });

  it("keeps an IPv4 address and groups it by /24", () => {
    expect(clientAddress(from("203.0.113.7"))).toBe("203.0.113.7");
    expect(clientNetwork(from("203.0.113.7"))).toBe("203.0.113.0/24");
  });

  it("treats an IPv6 /64 as one client and groups it by /48", () => {
    expect(clientAddress(from("2001:db8:abcd:12:1:2:3:4"))).toBe("2001:0db8:abcd:0012::/64");
    expect(clientAddress(from("2001:db8:abcd:12::99"))).toBe("2001:0db8:abcd:0012::/64");
    expect(clientNetwork(from("2001:db8:abcd:12::99"))).toBe("2001:0db8:abcd::/48");
  });

  it("unwraps an IPv4 address carried in IPv6", () => {
    expect(clientAddress(from("::ffff:203.0.113.7"))).toBe("203.0.113.7");
  });

  it("has one bucket for requests with no address", () => {
    expect(clientAddress(from())).toBe("unknown");
    expect(clientNetwork(from())).toBe("unknown");
  });
});

describe("cross-site writes", () => {
  const url = new URL("https://app.example/api/thing");
  const request = (method: string, headers: Record<string, string>) => new Request(url, { method, headers });

  it("are writes whose Origin is another site", () => {
    expect(isCrossSiteWrite(request("POST", { origin: "https://evil.example" }), url)).toBe(true);
    expect(isCrossSiteWrite(request("DELETE", { origin: "https://app.example.evil.example" }), url)).toBe(true);
    expect(isCrossSiteWrite(request("POST", { origin: "http://app.example" }), url)).toBe(true);
    expect(isCrossSiteWrite(request("POST", { origin: "null" }), url)).toBe(true);
    expect(isCrossSiteWrite(request("POST", { origin: "https://app.example" }), url)).toBe(false);
  });

  it("fall back to Sec-Fetch-Site when there is no Origin", () => {
    expect(isCrossSiteWrite(request("POST", { "sec-fetch-site": "cross-site" }), url)).toBe(true);
    expect(isCrossSiteWrite(request("POST", { "sec-fetch-site": "same-site" }), url)).toBe(true);
    expect(isCrossSiteWrite(request("POST", { "sec-fetch-site": "same-origin" }), url)).toBe(false);
    // A native app or a server: neither header.
    expect(isCrossSiteWrite(request("POST", {}), url)).toBe(false);
  });

  it("never apply to reads", () => {
    expect(isCrossSiteWrite(request("GET", { origin: "https://evil.example" }), url)).toBe(false);
  });

  it("exempt only Apple's callback, and only as a POST", () => {
    expect(isCrossSiteAuthCallback("POST", "/api/auth/callback/apple", "/api/auth")).toBe(true);
    expect(isCrossSiteAuthCallback("PUT", "/api/auth/callback/apple", "/api/auth")).toBe(false);
    expect(isCrossSiteAuthCallback("POST", "/api/auth/callback/google", "/api/auth")).toBe(false);
    expect(isCrossSiteAuthCallback("POST", "/api/auth/callback/apple/extra", "/api/auth")).toBe(false);
  });
});

describe("Apple client secret", () => {
  const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
  const env = {
    APPLE_CLIENT_ID: "com.example.web",
    APPLE_TEAM_ID: "TEAM123456",
    APPLE_KEY_ID: "KEY1234567",
    APPLE_PRIVATE_KEY: privateKey.export({ format: "pem", type: "pkcs8" }) as string,
  };

  it("is a short-lived token Apple can verify with the team's key", async () => {
    const secret = await appleClientSecret(env);
    expect(decodeProtectedHeader(secret)).toMatchObject({ alg: "ES256", kid: "KEY1234567" });
    const key = await importSPKI(publicKey.export({ format: "pem", type: "spki" }) as string, "ES256");
    const { payload } = await jwtVerify(secret, key, { audience: "https://appleid.apple.com" });
    expect(payload).toMatchObject({ iss: "TEAM123456", sub: "com.example.web" });
    expect((payload.exp ?? 0) - (payload.iat ?? 0)).toBeLessThanOrEqual(60 * 60);
  });

  it("accepts a key pasted on one line", async () => {
    const oneLine = {
      ...env,
      APPLE_KEY_ID: "KEYONELINE",
      APPLE_PRIVATE_KEY: env.APPLE_PRIVATE_KEY.replace(/\n/g, "\\n"),
    };
    expect(decodeProtectedHeader(await appleClientSecret(oneLine)).kid).toBe("KEYONELINE");
  });

  it("refuses to run half-configured", async () => {
    await expect(appleClientSecret({ ...env, APPLE_KEY_ID: undefined })).rejects.toThrow(/not configured/);
  });
});
