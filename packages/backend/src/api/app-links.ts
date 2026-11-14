// The two files that let links to the product's domain open the native app instead of the
// browser: Apple's app site association and Android's asset links. Both are built from the
// product config, so they always name the app that config describes.
import { productOf } from "../core/product";
import type { Env } from "../env";

const APPLE_PATH = "/.well-known/apple-app-site-association";
const ANDROID_PATH = "/.well-known/assetlinks.json";

/** Paths that open in the app: the signed-in product, never the public site or sign-in. */
const APP_PATHS = ["/app", "/app/*"];

const json = (body: unknown) => Response.json(body, { headers: { "cache-control": "public, max-age=3600" } });

/** The app-link file for this path, or null when the path is not one or the product has no app set up for it. */
export function appLinks(pathname: string, env: Env): Response | null {
  if (pathname !== APPLE_PATH && pathname !== ANDROID_PATH) return null;
  const { mobile } = productOf(env);
  if (!mobile) return null;

  if (pathname === APPLE_PATH) {
    // Apple identifies the app by team id and bundle id.
    if (!env.APPLE_TEAM_ID) return null;
    return json({
      applinks: {
        details: [
          { appIDs: [`${env.APPLE_TEAM_ID}.${mobile.bundleId}`], components: APP_PATHS.map((path) => ({ "/": path })) },
        ],
      },
      webcredentials: { apps: [`${env.APPLE_TEAM_ID}.${mobile.bundleId}`] },
    });
  }
  // Android identifies the app by package and the fingerprint of the key that signed it.
  const fingerprints = (env.ANDROID_CERT_SHA256 ?? "")
    .split(",")
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);
  if (fingerprints.length === 0) return null;
  return json([
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: { namespace: "android_app", package_name: mobile.androidPackage, sha256_cert_fingerprints: fingerprints },
    },
  ]);
}
