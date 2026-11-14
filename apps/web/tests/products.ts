// The product configs the Workers-runtime tests run against. A test picks one per request
// (see harness.ts); the default is a launched product with open signup.
import type { McpServerDefinition } from "@app/mcp";
import { defineProduct, type Product, type ProductConfig } from "@app/shared/product";

const base: ProductConfig = {
  name: "Test Product",
  slug: "test-product",
  tagline: "",
  domains: { app: "", email: "" },
  access: { preset: "public-product" },
  signIn: { emailCode: true, google: false, apple: false },
};

export const PRODUCTS = {
  "public-product": defineProduct(base),
  private: defineProduct({ ...base, access: { preset: "private" } }),
  "internal-tool": defineProduct({ ...base, access: { preset: "internal-tool" } }),
  "private-beta": defineProduct({ ...base, access: { preset: "private-beta" } }),
  /** Before launch, with assistants able to reach the MCP endpoints from outside. */
  "private-mcp-public": defineProduct({
    ...base,
    access: { preset: "private", areas: { mcp: { visibility: "public" } } },
  }),
  "signup-closed": defineProduct({ ...base, signup: { mode: "closed" } }),
  "signup-allowlist": defineProduct({ ...base, signup: { mode: "allowlist" } }),
  "signup-domain": defineProduct({ ...base, signup: { mode: "domain", domains: ["corp.example"] } }),
  "social-sign-in": defineProduct({ ...base, signIn: { emailCode: true, google: true, apple: true } }),
  /** A launched product with an iOS and Android app. */
  "with-app": defineProduct({
    ...base,
    domains: { app: "product.example", email: "" },
    signIn: { emailCode: true, google: true, apple: true },
    mobile: { bundleId: "com.example.testproduct", androidPackage: "com.example.testproduct", minVersion: "1.2.0" },
  }),
} satisfies Record<string, Product>;

export type ProductName = keyof typeof PRODUCTS;

/**
 * A second MCP server, only in tests: it proves that the registry serves more than one, and
 * that a tool is offered only to a connection holding the scope it needs.
 */
export const WRITER_SERVER: McpServerDefinition = {
  route: "/mcp/writer",
  name: "Writer",
  version: "0.0.0",
  tools: { "system.ping": "app:write" },
};
export const PRODUCT_HEADER = "x-test-product";
