// The OAuth consent step: who is connecting an assistant, and what they allow it.
//
// GET /authorize   validates the request, binds a consent handle to the signed-in person
//                  and sends the browser to the consent page (an Astryx page in apps/web).
// POST /authorize  records the decision and returns the browser to the assistant.
//
// The signed-in person comes from the Better Auth session. A handle started by one account
// cannot be approved by another: the binding row is checked and deleted in one statement.
import { bindConsent, createGrant, type Env, sessionPrincipal, takeConsent } from "@app/backend";
import { isScope, REQUIRED_SCOPE } from "@app/shared";
import { AuthorizationError, CimdFetchError } from "@cloudflare/workers-oauth-provider";
import { SERVER_NAME } from "../servers/main/scopes";

export const AUTHORIZE_PATH = "/authorize";
export const CONSENT_PAGE = "/connect/consent";
export const SIGN_IN_PAGE = "/sign-in";

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

function page(title: string, body: string, status = 200, headers = new Headers()): Response {
  headers.set("content-type", "text/html; charset=utf-8");
  headers.set("cache-control", "no-store");
  headers.set(
    "content-security-policy",
    "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'",
  );
  headers.set("x-content-type-options", "nosniff");
  headers.set("referrer-policy", "no-referrer");
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><style>body{font:16px/1.5 system-ui,sans-serif;max-width:32rem;margin:15vh auto;padding:0 1rem;color-scheme:light dark}a{color:inherit}</style></head><body>${body}</body></html>`;
  return new Response(html, { status, headers });
}

/**
 * Returns the browser to the assistant from a fresh document, which ends the form
 * submission's redirect chain. Only ever pass a `redirectTo` the OAuth provider returned
 * after validating the client and its registered callback, never a request value.
 */
function handoff(redirectTo: string, headers: Headers, outcome: "approved" | "denied"): Response {
  const url = new URL(redirectTo);
  const loopback = url.hostname === "localhost" || url.hostname === "[::1]" || /^127\./.test(url.hostname);
  const safe = (url.protocol === "https:" || (url.protocol === "http:" && loopback)) && !url.username && !url.password;
  if (!safe) throw new Error("Invalid provider callback");
  const out = new Headers(headers);
  out.delete("location");
  const target = escapeHtml(redirectTo);
  const title = outcome === "approved" ? "Connection approved" : "Connection cancelled";
  return page(
    title,
    `<meta http-equiv="refresh" content="0;url=${target}"><h1>${title}</h1><p>Returning to your assistant.</p><p><a href="${target}">Continue</a> if nothing happens.</p>`,
    200,
    out,
  );
}

const expired = () =>
  page(
    "Connection page expired",
    "<h1>This connection page is no longer active</h1><p>It has expired or was already used. Go back to your assistant and connect again.</p>",
    400,
  );

export async function authorize(request: Request, env: Env): Promise<Response> {
  const provider = env.OAUTH_PROVIDER;
  if (!provider) return new Response("Not found", { status: 404 });
  const url = new URL(request.url);
  const principal = await sessionPrincipal(env, url.origin, request.headers);

  try {
    if (request.method === "GET") {
      if (!principal) {
        const next = encodeURIComponent(url.pathname + url.search);
        return new Response(null, {
          status: 302,
          headers: { location: `${SIGN_IN_PAGE}?next=${next}`, "cache-control": "no-store" },
        });
      }
      const auth = await provider.parseAuthRequest(request);
      const details = await provider.describeConsent(auth);
      const consent = await provider.beginConsent(auth);
      // The required scope is always part of the request, even when a client asks for none.
      const requested = details.scope.includes(REQUIRED_SCOPE) ? details.scope : [REQUIRED_SCOPE, ...details.scope];
      await bindConsent(env, consent.handle, principal.userId, {
        clientName: details.clientName,
        clientDomain: details.clientDomain ?? "",
        redirectHost: details.redirectHost,
        scopes: requested.filter(isScope),
      });
      // The provider's headers bind the handle to this browser; they travel with the redirect.
      const headers = new Headers(consent.headers);
      headers.set("location", `${CONSENT_PAGE}?h=${encodeURIComponent(consent.handle)}`);
      headers.set("cache-control", "no-store");
      return new Response(null, { status: 303, headers });
    }

    if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
    if (!principal) return new Response("Sign in to continue.", { status: 401 });
    const form = await request.formData();
    const handle = String(form.get("handle") ?? "");
    const pending = await takeConsent(env, handle, principal.userId);
    if (!pending) return expired();

    if (form.get("decision") !== "approve") {
      const denied = await provider.denyConsent(request, handle);
      return handoff(denied.redirectTo, denied.headers, "denied");
    }

    // Never more than the assistant asked for, whatever the form posted.
    const chosen = new Set([REQUIRED_SCOPE, ...form.getAll("scope").map(String)]);
    const scope = pending.scopes.filter((item) => chosen.has(item));
    const approved = await provider.approveConsent(request, handle, { scope });
    const grantId = await createGrant(env, {
      userId: principal.userId,
      clientId: approved.request.clientId,
      clientName: pending.clientName,
      scopes: approved.request.scope,
    });
    const { redirectTo } = await provider.completeAuthorization({
      request: approved.request,
      userId: principal.userId,
      metadata: { label: `${SERVER_NAME} assistant`, assistantGrantId: grantId },
      scope: approved.request.scope,
      props: { userId: principal.userId, assistantGrantId: grantId },
      revokeExistingGrants: false,
    });
    return handoff(redirectTo, approved.headers, "approved");
  } catch (error) {
    if (error instanceof AuthorizationError || error instanceof CimdFetchError) {
      return page(
        "Connection error",
        "<h1>The connection could not finish</h1><p>Go back to your assistant and connect again.</p>",
        400,
      );
    }
    throw error;
  }
}
