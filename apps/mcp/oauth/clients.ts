// Which app is connecting. Apps such as Cursor register a new OAuth client every time they
// connect, so the client id cannot tell a reconnect from a new assistant. The client key can:
//   - a client that identifies itself by a metadata document URL is that URL;
//   - otherwise it is the app's name plus where it sends people back to;
//   - an app with no name is only ever itself.
// Approving the same app again replaces its earlier connection (packages/backend, createGrant).

export interface RegisteredClient {
  clientName?: string | null;
  redirectUris?: readonly string[] | null;
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** A Client ID Metadata Document client: its client id is an https URL with a path. */
export function isMetadataDocumentClient(clientId: string): boolean {
  try {
    const url = new URL(clientId);
    return url.protocol === "https:" && url.pathname !== "/" && url.pathname !== "";
  } catch {
    return false;
  }
}

const normalName = (name: string | null | undefined) =>
  (name ?? "").normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();

/** Scheme, host and path: no port (local apps pick a new one each time), query or fragment. */
function normalRedirect(uri: string): string | null {
  try {
    const url = new URL(uri);
    return `${url.protocol.toLowerCase()}//${url.hostname.toLowerCase()}${url.pathname}`;
  } catch {
    return null;
  }
}

/** The stable identity of the app behind an OAuth client. The same inputs always give the same key. */
export async function clientKey(clientId: string, client: RegisteredClient | null): Promise<string> {
  if (isMetadataDocumentClient(clientId)) return `cimd:${clientId}`;
  const name = normalName(client?.clientName);
  if (!client || !name) return `client:${await sha256(clientId)}`;
  const redirects = [...new Set((client.redirectUris ?? []).map(normalRedirect).filter((uri) => uri !== null))].sort();
  return `dcr:${await sha256(JSON.stringify([name, redirects]))}`;
}
