// What the build was configured with (app.config.ts → `extra`).
import Constants from "expo-constants";

interface Extra {
  apiOrigin: string;
  appName: string;
  accessClientId?: string;
  accessClientSecret?: string;
}

const extra = (Constants.expoConfig?.extra ?? {}) as Partial<Extra>;

/**
 * The Worker this build talks to: the product's address from app.config.ts, unless the build
 * was pointed elsewhere with EXPO_PUBLIC_API_ORIGIN (a local Worker, staging).
 */
export const API_ORIGIN = (process.env.EXPO_PUBLIC_API_ORIGIN ?? extra.apiOrigin ?? "").replace(/\/$/, "");
export const APP_NAME = extra.appName ?? "";
export const APP_VERSION = Constants.expoConfig?.version ?? "0.0.0";
export const APP_SCHEME = typeof Constants.expoConfig?.scheme === "string" ? Constants.expoConfig.scheme : "";

/**
 * Headers that let a development build through Cloudflare Access while the product is still
 * internal. Empty in every other build: store builds are never given a service token.
 */
export const ACCESS_HEADERS: Record<string, string> =
  extra.accessClientId && extra.accessClientSecret
    ? { "CF-Access-Client-Id": extra.accessClientId, "CF-Access-Client-Secret": extra.accessClientSecret }
    : {};
