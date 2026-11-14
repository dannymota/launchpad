// The shape of product/product.config.ts: the one file a new project edits. Everything
// here is plain data that is safe to commit. Email addresses, keys and other secrets are
// Worker variables and secrets instead (see packages/backend/src/env.ts).
import { type AccessConfig, type AccessMap, PRESETS, resolveAccess, type SignupMode } from "./access";

export interface ProductConfig {
  /** The name people see. */
  name: string;
  /** Lowercase letters, digits and dashes. Names the Worker, the database and the app scheme. */
  slug: string;
  tagline: string;
  domains: {
    /** The product's own domain, e.g. "example.com". Empty until launch: workers.dev stands in. */
    app: string;
    /** The domain mail is sent from, onboarded in Cloudflare Email Service. Empty = no mail. */
    email: string;
  };
  access: AccessConfig;
  signup?: {
    /** Who may create an account. Defaults to the access preset's mode. */
    mode?: SignupMode;
    /** For mode "domain": email domains whose addresses may sign up, e.g. ["example.com"]. */
    domains?: string[];
  };
  signIn: {
    emailCode: boolean;
    google: boolean;
    apple: boolean;
  };
  /** The iOS and Android app. Leave out for a product with no mobile app. */
  mobile?: {
    /** iOS bundle identifier, e.g. "com.example.app". */
    bundleId: string;
    /** Android application id. Usually the same as the bundle id. */
    androidPackage: string;
    /** The oldest app version the API still serves. Older builds are told to update. */
    minVersion: string;
  };
}

/** The config with its defaults filled in and its access map worked out. */
export interface Product extends ProductConfig {
  areas: AccessMap;
  signup: { mode: SignupMode; domains: string[] };
  /** The app's URL scheme ("acme" opens acme://…). The slug without dashes, so it is valid on both platforms. */
  scheme: string;
}

const SLUG = /^[a-z][a-z0-9-]{1,30}[a-z0-9]$/;
const DOMAIN = /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/;
const APP_ID = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/i;
const VERSION = /^\d+\.\d+\.\d+$/;

/** Checks a config and fills in what it leaves out. Throws with the field to fix. */
export function defineProduct(config: ProductConfig): Product {
  if (!config.name.trim()) throw new Error("product.config: name is empty.");
  if (!SLUG.test(config.slug))
    throw new Error(`product.config: slug "${config.slug}" must be lowercase letters, digits and dashes.`);
  for (const [key, value] of Object.entries(config.domains)) {
    if (value && !DOMAIN.test(value))
      throw new Error(`product.config: domains.${key} "${value}" is not a domain name.`);
  }
  const domains = (config.signup?.domains ?? []).map((domain) => domain.trim().toLowerCase());
  for (const domain of domains) {
    if (!DOMAIN.test(domain))
      throw new Error(`product.config: signup.domains has "${domain}", which is not a domain name.`);
  }
  const mode = config.signup?.mode ?? PRESETS[config.access.preset]?.signup;
  if (mode === "domain" && domains.length === 0) {
    throw new Error('product.config: signup.mode "domain" needs at least one entry in signup.domains.');
  }
  if (config.mobile) {
    const { bundleId, androidPackage, minVersion } = config.mobile;
    if (!APP_ID.test(bundleId))
      throw new Error(`product.config: mobile.bundleId "${bundleId}" is not a bundle identifier.`);
    if (!APP_ID.test(androidPackage))
      throw new Error(`product.config: mobile.androidPackage "${androidPackage}" is not an application id.`);
    if (!VERSION.test(minVersion))
      throw new Error(`product.config: mobile.minVersion "${minVersion}" must look like 1.0.0.`);
  }
  const scheme = config.slug.replaceAll("-", "");
  return { ...config, areas: resolveAccess(config.access), signup: { mode, domains }, scheme };
}
