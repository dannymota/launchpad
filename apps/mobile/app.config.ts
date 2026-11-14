// The app's native settings. Shared values come from product/product.config.ts, so the
// name, scheme, bundle id and API address are never typed twice. iOS and Android each have
// their own block below.
import type { Product } from "@app/shared/product";
import type { ConfigContext, ExpoConfig } from "expo/config";

const product: Product = require("./config/load-product").loadProduct();

const mobile = product.mobile;
if (!mobile) throw new Error("product/product.config.ts has no `mobile` block. Add one, or remove apps/mobile.");

// Where the API lives. Until the product has its domain, the Worker's workers.dev address
// stands in; set EXPO_PUBLIC_API_ORIGIN to point a build somewhere else (a local Worker, staging).
const apiOrigin =
  process.env.EXPO_PUBLIC_API_ORIGIN ?? `https://${product.domains.app || `${product.slug}.workers.dev`}`;
const linkHost = product.domains.app;

// A development build can reach a product that is still behind Cloudflare Access with a
// service token. Set these two in EAS for the development profile only: a store build must
// never carry them.
const development = process.env.APP_VARIANT === "development";
const access = development
  ? { accessClientId: process.env.ACCESS_CLIENT_ID, accessClientSecret: process.env.ACCESS_CLIENT_SECRET }
  : {};

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: development ? `${product.name} (dev)` : product.name,
  slug: product.slug,
  scheme: product.scheme,
  version: "1.0.0",
  orientation: "portrait",
  userInterfaceStyle: "automatic",
  icon: "./assets/icon.png",

  ios: {
    bundleIdentifier: development ? `${mobile.bundleId}.dev` : mobile.bundleId,
    supportsTablet: true,
    usesAppleSignIn: product.signIn.apple,
    // Links to the product's domain open the app (the Worker serves the matching association file).
    associatedDomains: linkHost ? [`applinks:${linkHost}`] : [],
    config: { usesNonExemptEncryption: false },
  },

  android: {
    package: development ? `${mobile.androidPackage}.dev` : mobile.androidPackage,
    adaptiveIcon: { foregroundImage: "./assets/adaptive-icon.png", backgroundColor: "#ffffff" },
    predictiveBackGestureEnabled: true,
    intentFilters: linkHost
      ? [
          {
            action: "VIEW",
            autoVerify: true,
            data: [{ scheme: "https", host: linkHost, pathPrefix: "/app" }],
            category: ["BROWSABLE", "DEFAULT"],
          },
        ]
      : [],
  },

  web: { bundler: "metro", output: "single" },

  plugins: [
    "expo-router",
    "expo-secure-store",
    "expo-web-browser",
    ["expo-splash-screen", { backgroundColor: "#ffffff", image: "./assets/splash-icon.png", imageWidth: 160 }],
    ...(product.signIn.apple ? ["expo-apple-authentication"] : []),
  ],
  experiments: { typedRoutes: true, reactCompiler: true },

  extra: { apiOrigin, appName: product.name, ...access },
});
