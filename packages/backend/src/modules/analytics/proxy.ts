// Passes analytics requests on to PostHog. Only what PostHog needs goes along: no cookies,
// no sign-in, no Cloudflare Access token.
import type { Env } from "../../env";

export const INGEST_PREFIX = "/ingest";
const DEFAULT_HOST = "https://us.i.posthog.com";

/** Request headers PostHog's endpoints read. Everything else stays here. */
const FORWARDED = ["accept", "accept-language", "content-encoding", "content-type", "user-agent"];
/** Response headers that describe the body. Cookies and the rest are dropped. */
const RETURNED = ["cache-control", "content-encoding", "content-type", "etag", "vary"];

function hostsOf(env: Env): { api: URL; assets: URL } | null {
  try {
    const api = new URL(env.POSTHOG_HOST?.trim() || DEFAULT_HOST);
    if (api.protocol !== "https:") return null;
    // PostHog serves its scripts from a sibling host: us.i.posthog.com -> us-assets.i.posthog.com.
    const assets = new URL(
      api.origin.replace(/^https:\/\/([a-z]+)\.i\.posthog\.com$/, "https://$1-assets.i.posthog.com"),
    );
    return { api, assets };
  } catch {
    return null;
  }
}

export async function proxy(request: Request, env: Env): Promise<Response> {
  if (request.method !== "GET" && request.method !== "POST") return new Response(null, { status: 405 });
  const hosts = hostsOf(env);
  if (!hosts) return new Response(null, { status: 502 });

  const url = new URL(request.url);
  const path = url.pathname.slice(INGEST_PREFIX.length) || "/";
  const upstream = path.startsWith("/static/") || path.startsWith("/array/") ? hosts.assets : hosts.api;

  const headers = new Headers();
  for (const name of FORWARDED) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  // So PostHog places the visitor by their own address, not this Worker's.
  const address = request.headers.get("cf-connecting-ip");
  if (address) headers.set("x-forwarded-for", address);

  let response: Response;
  try {
    response = await fetch(new URL(path + url.search, upstream), {
      method: request.method,
      headers,
      body: request.method === "POST" ? request.body : undefined,
      redirect: "manual",
    });
  } catch {
    return new Response(null, { status: 502 });
  }
  const returned = new Headers();
  for (const name of RETURNED) {
    const value = response.headers.get(name);
    if (value) returned.set(name, value);
  }
  return new Response(response.body, { status: response.status, headers: returned });
}
