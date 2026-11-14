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
  // >>> mcp
  /** Before launch, with assistants able to reach the MCP endpoints from outside. */
  "private-mcp-public": defineProduct({
    ...base,
    access: { preset: "private", areas: { mcp: { visibility: "public" } } },
  }),
  // <<< mcp
  "signup-closed": defineProduct({ ...base, signup: { mode: "closed" } }),
  "signup-allowlist": defineProduct({ ...base, signup: { mode: "allowlist" } }),
  "signup-domain": defineProduct({ ...base, signup: { mode: "domain", domains: ["corp.example"] } }),
  "social-sign-in": defineProduct({ ...base, signIn: { emailCode: true, google: true, apple: true } }),
  // >>> payments
  "with-plans": defineProduct({
    ...base,
    plans: [
      { id: "free", name: "Free", price: "Free", paid: false, includes: ["The basics"] },
      { id: "pro", name: "Pro", price: "$12 a month", paid: true, includes: ["Everything"] },
    ],
  }),
  // <<< payments
  // >>> mobile
  /** A launched product with an iOS and Android app. */
  "with-app": defineProduct({
    ...base,
    domains: { app: "product.example", email: "" },
    signIn: { emailCode: true, google: true, apple: true },
    mobile: { bundleId: "com.example.testproduct", androidPackage: "com.example.testproduct", minVersion: "1.2.0" },
  }),
  // <<< mobile
} satisfies Record<string, Product>;

export type ProductName = keyof typeof PRODUCTS;

/** Settings a test can switch on for one request, on top of the test Worker's own. */
export const ENVIRONMENTS = {
  // >>> ai
  ai: { ANTHROPIC_API_KEY: "sk-ant-test-runtime" },
  /** Through an AI Gateway that asks for a token, on the cheapest model. */
  "ai-gateway": {
    ANTHROPIC_API_KEY: "sk-ant-test-runtime",
    AI_GATEWAY_URL: "https://gateway.ai.cloudflare.com/v1/test-account/test-gateway/anthropic",
    AI_GATEWAY_TOKEN: "gateway-token-test",
    AI_MODEL: "claude-haiku-5-5",
  },
  /** Room for exactly one call at a time in a person's share. */
  "ai-tight": { ANTHROPIC_API_KEY: "sk-ant-test-runtime", AI_PERSON_MONTHLY_BUDGET_USD: "1" },
  "ai-spent": { ANTHROPIC_API_KEY: "sk-ant-test-runtime", AI_MONTHLY_BUDGET_USD: "0" },
  // <<< ai
  // >>> analytics
  posthog: { POSTHOG_KEY: "phc_test_runtime" },
  "posthog-eu": { POSTHOG_KEY: "phc_test_runtime", POSTHOG_HOST: "https://eu.i.posthog.com" },
  // <<< analytics
  // >>> payments
  stripe: {
    STRIPE_SECRET_KEY: "sk_test_runtime",
    STRIPE_WEBHOOK_SECRET: "whsec_runtime",
    STRIPE_PRICE_PRO: "price_pro_test",
  },
  // <<< payments
} satisfies Record<string, Record<string, string>>;
export type EnvironmentName = keyof typeof ENVIRONMENTS;
export const ENVIRONMENT_HEADER = "x-test-env";

// >>> mcp
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
// <<< mcp
export const PRODUCT_HEADER = "x-test-product";
