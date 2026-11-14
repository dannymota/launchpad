// Facts the Worker's router has established about a request, carried to whoever handles it
// (the API, a page, another surface) as request headers. The router is the only writer:
// it removes any copy a client sent before setting its own, so a handler can trust them.
import type { Identity } from "@app/shared/product";

const PREFIX = "x-app-";
export const ORIGIN_HEADER = `${PREFIX}origin`;
const IDENTITY_HEADER = `${PREFIX}identity`;
const ACCESS_EMAIL_HEADER = `${PREFIX}access-email`;

export interface RequestFacts {
  /** The request's own origin. */
  origin: string;
  /** How the area this request belongs to identifies people. */
  identity: Identity;
  /** The email Cloudflare Access verified, when the area takes it as the sign-in. */
  accessEmail: string | null;
}

/** The request's headers with every client-sent internal header removed and the router's facts set. */
export function trustedHeaders(incoming: Headers, facts: RequestFacts): Headers {
  const headers = new Headers(incoming);
  for (const name of [...headers.keys()]) if (name.toLowerCase().startsWith(PREFIX)) headers.delete(name);
  headers.set(ORIGIN_HEADER, facts.origin);
  headers.set(IDENTITY_HEADER, facts.identity);
  if (facts.accessEmail) headers.set(ACCESS_EMAIL_HEADER, facts.accessEmail);
  return headers;
}

/** The router's facts, read back by a handler. Null when the request did not come through the router. */
export function requestFacts(headers: Headers): RequestFacts | null {
  const origin = headers.get(ORIGIN_HEADER);
  const identity = headers.get(IDENTITY_HEADER);
  if (!origin || (identity !== "access" && identity !== "session")) return null;
  return { origin, identity, accessEmail: headers.get(ACCESS_EMAIL_HEADER) };
}
