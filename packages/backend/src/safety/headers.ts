// The response headers every answer leaves with: a content security policy, no framing, no
// MIME sniffing, HTTPS only. Pages get a per-response script nonce.
import type { Env } from "../env";

const TURNSTILE = "https://challenges.cloudflare.com";

export interface ResponseContext {
  /** True only for the public site on the product's own domain: everything else is kept out of search engines. */
  indexable: boolean;
}

function pagePolicy(nonce: string, https: boolean, turnstile: boolean, devServer: boolean): string {
  const extra = turnstile ? ` ${TURNSTILE}` : "";
  // React's development build uses eval() to rebuild server call stacks. Only on a developer
  // machine: APP_ENV is "local" there and nowhere else.
  const evalForDev = devServer ? " 'unsafe-eval'" : "";
  return [
    "default-src 'self'",
    "base-uri 'self'",
    `connect-src 'self'${extra}`,
    // The default Astryx theme loads its typeface from Google Fonts. /brand replaces it.
    "font-src 'self' https://fonts.gstatic.com",
    "form-action 'self'",
    "frame-ancestors 'none'",
    `frame-src ${turnstile ? TURNSTILE : "'none'"}`,
    "img-src 'self' data: blob:",
    "object-src 'none'",
    `script-src 'self' 'nonce-${nonce}'${evalForDev}${extra}`,
    "script-src-attr 'none'",
    // Astryx sets some styles inline (StyleX runtime values), so inline styles are allowed.
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    ...(https ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}

/** For answers that are not pages (JSON, redirects): nothing may load, nothing may frame them. */
const DATA_POLICY = "default-src 'none'; frame-ancestors 'none'; base-uri 'none'";

function nonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes));
}

/**
 * Adds the security headers to a response. A handler that set its own content security
 * policy keeps it (the assistant handoff pages do). HTML gets a fresh nonce on each of its
 * script tags, so a script that did not come from the server's own render cannot run.
 */
export function secured(request: Request, response: Response, env: Env, context: ResponseContext): Response {
  // A WebSocket upgrade must be returned untouched.
  if (response.status === 101) return response;
  const url = new URL(request.url);
  const https = url.protocol === "https:";
  const headers = new Headers(response.headers);
  headers.set("x-content-type-options", "nosniff");
  headers.set("x-frame-options", "DENY");
  headers.set("referrer-policy", "strict-origin-when-cross-origin");
  headers.set("permissions-policy", "camera=(), microphone=(), geolocation=(), payment=()");
  if (https) headers.set("strict-transport-security", "max-age=31536000; includeSubDomains");
  if (!context.indexable) headers.set("x-robots-tag", "noindex, nofollow, noarchive");

  const isPage =
    request.method !== "HEAD" &&
    response.body !== null &&
    (headers.get("content-type") ?? "").toLowerCase().includes("text/html");
  if (!isPage || headers.has("content-security-policy")) {
    if (!headers.has("content-security-policy")) headers.set("content-security-policy", DATA_POLICY);
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  }

  const scriptNonce = nonce();
  headers.set(
    "content-security-policy",
    pagePolicy(scriptNonce, https, Boolean(env.TURNSTILE_SITE_KEY), env.APP_ENV === "local"),
  );
  // A page must be revalidated, so a new deploy is picked up on the next visit.
  if (!headers.has("cache-control")) headers.set("cache-control", "no-cache");
  headers.delete("content-length");
  const page = new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  return new HTMLRewriter()
    .on("script", {
      element(element) {
        element.setAttribute("nonce", scriptNonce);
      },
    })
    .transform(page);
}

const MAX_BODY_BYTES = 1024 * 1024;

/**
 * Null when the request's body is within the limit (or it has none). Otherwise the answer
 * to send. A body with no declared length is cut off at the limit as it is read.
 */
export function bodyLimit(request: Request): { request: Request } | { refused: Response } {
  if (!request.body) return { request };
  const declared = Number(request.headers.get("content-length") ?? "");
  const tooLarge = () =>
    Response.json({ code: "PAYLOAD_TOO_LARGE", message: "That request is too large." }, { status: 413 });
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) return { refused: tooLarge() };
  if (request.headers.has("content-length")) return { request };
  let seen = 0;
  const counted = request.body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        seen += chunk.byteLength;
        if (seen > MAX_BODY_BYTES) controller.error(new Error("Request body is too large."));
        else controller.enqueue(chunk);
      },
    }),
  );
  return { request: new Request(request, { body: counted, duplex: "half" } as RequestInit) };
}
