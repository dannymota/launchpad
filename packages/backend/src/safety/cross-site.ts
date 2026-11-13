// Requests that change something must come from this site. SameSite cookies do not stop a
// sibling host on the same registrable domain (another Worker on workers.dev, a preview
// host), so every write from another origin is refused before it reaches any handler.
// Native apps and server-to-server calls send no Origin and are not affected.
const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function isCrossSiteWrite(request: Request, url: URL): boolean {
  if (!WRITE_METHODS.has(request.method)) return false;
  const origin = request.headers.get("origin");
  if (origin) return origin !== url.origin;
  const site = request.headers.get("sec-fetch-site");
  return site === "cross-site" || site === "same-site";
}

/**
 * Better Auth routes that another site posts to by design. Apple returns the browser to
 * the app with a cross-site form POST ("form_post" response mode); the callback checks
 * the signed state it carries, which is what makes the request trustworthy.
 */
export function isCrossSiteAuthCallback(method: string, pathname: string, authBasePath: string): boolean {
  return method === "POST" && pathname === `${authBasePath}/callback/apple`;
}
