import { describe, expect, it } from "vitest";
import { defineProduct, type ProductConfig } from "../src/product";

const base: ProductConfig = {
  name: "Acme",
  slug: "acme",
  tagline: "",
  domains: { app: "", email: "" },
  access: { preset: "private" },
  signIn: { emailCode: true, google: false, apple: false },
};

describe("defineProduct", () => {
  it("takes the signup mode from the access preset unless one is given", () => {
    expect(defineProduct(base).signup.mode).toBe("allowlist");
    expect(defineProduct({ ...base, access: { preset: "internal-tool" } }).signup.mode).toBe("closed");
    expect(defineProduct({ ...base, access: { preset: "public-product" } }).signup.mode).toBe("open");
    expect(defineProduct({ ...base, signup: { mode: "open" } }).signup.mode).toBe("open");
  });

  it("needs domains for the domain signup mode", () => {
    expect(() => defineProduct({ ...base, signup: { mode: "domain" } })).toThrow(/signup.domains/);
    expect(defineProduct({ ...base, signup: { mode: "domain", domains: ["Example.com"] } }).signup.domains).toEqual([
      "example.com",
    ]);
  });

  it("rejects a bad slug or domain", () => {
    expect(() => defineProduct({ ...base, slug: "Acme App" })).toThrow(/slug/);
    expect(() => defineProduct({ ...base, domains: { app: "https://acme.com", email: "" } })).toThrow(/domains.app/);
  });

  it("works out the access map", () => {
    expect(defineProduct(base).areas.product).toMatchObject({
      visibility: "internal",
      auth: "user",
      identity: "access",
    });
  });
});
