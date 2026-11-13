// Connecting an assistant, proven on the Workers runtime: discovery, client registration,
// consent bound to the signed-in person, token exchange, and API procedures called as MCP tools.
import { beforeAll, describe, expect, it } from "vitest";
import { Browser, migrate, ORIGIN, signIn } from "./harness";

const REDIRECT_URI = "http://127.0.0.1:53682/callback";
const ASSISTANT = "https://assistant.example";

beforeAll(migrate);

const base64url = (bytes: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(bytes as ArrayBuffer)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

/** An assistant: it registers itself and holds the PKCE secret for one authorization. */
async function newClient(scope = "app:read offline_access") {
  const machine = new Browser();
  const registered = await machine.fetch("/oauth/register", {
    method: "POST",
    headers: { "content-type": "application/json", origin: ASSISTANT },
    body: JSON.stringify({
      client_name: "Test assistant",
      redirect_uris: [REDIRECT_URI],
      token_endpoint_auth_method: "none",
    }),
  });
  expect(registered.status).toBe(201);
  const { client_id: clientId } = (await registered.json()) as { client_id: string };
  const verifier = base64url(crypto.getRandomValues(new Uint8Array(32)));
  const challenge = base64url(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)));
  const authorizeUrl = `/authorize?${new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: REDIRECT_URI,
    scope,
    state: "state-1",
    code_challenge: challenge,
    code_challenge_method: "S256",
    resource: `${ORIGIN}/mcp`,
  })}`;
  const exchange = (code: string) =>
    machine.fetch("/oauth/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded", origin: ASSISTANT },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: REDIRECT_URI,
        client_id: clientId,
        code_verifier: verifier,
        resource: `${ORIGIN}/mcp`,
      }),
    });
  return { clientId, authorizeUrl, exchange };
}

/** Starts consent as `browser` and returns the handle the consent page would post back. */
async function beginConsent(browser: Browser, authorizeUrl: string): Promise<string> {
  const response = await browser.fetch(authorizeUrl);
  expect(response.status).toBe(303);
  const location = new URL(ORIGIN + (response.headers.get("location") ?? ""));
  expect(location.pathname).toBe("/connect/consent");
  return location.searchParams.get("h") ?? "";
}

const decision = (handle: string, choice: "approve" | "deny", scopes: string[]): [string, string][] => [
  ["handle", handle],
  ["decision", choice],
  ...scopes.map((scope): [string, string] => ["scope", scope]),
];

/** The address the handoff page sends the browser to. */
async function callbackOf(response: Response): Promise<URL> {
  const html = await response.text();
  const target = /url=([^"]+)"/.exec(html)?.[1] ?? "";
  return new URL(target.replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code))));
}

/** One JSON-RPC call over Streamable HTTP. */
async function mcp(token: string, body: Record<string, unknown>) {
  const response = await new Browser().fetch("/mcp", {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
    },
    body: JSON.stringify({ jsonrpc: "2.0", ...body }),
  });
  const text = await response.text();
  const data = (response.headers.get("content-type") ?? "").includes("text/event-stream")
    ? text
        .split("\n")
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trim())
        .pop()
    : text;
  // biome-ignore lint/suspicious/noExplicitAny: JSON-RPC results are read loosely in tests.
  return { status: response.status, message: data ? (JSON.parse(data) as any) : null };
}

/** Signs in, connects a new assistant with `granted` scopes, and returns its tokens. */
async function connect(email: string, requested: string, granted: string[]) {
  const { browser, userId } = await signIn(email);
  const client = await newClient(requested);
  const handle = await beginConsent(browser, client.authorizeUrl);
  const approved = await browser.postForm("/authorize", decision(handle, "approve", granted));
  expect(approved.status).toBe(200);
  const callback = await callbackOf(approved);
  const code = callback.searchParams.get("code") ?? "";
  const response = await client.exchange(code);
  expect(response.status).toBe(200);
  const tokens = (await response.json()) as { access_token: string; refresh_token?: string; scope?: string };
  return { browser, userId, client, code, callback, tokens };
}

describe("discovery", () => {
  it("answers an MCP call without a token with 401 and where to authorize", async () => {
    const response = await new Browser().fetch("/mcp", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    expect(response.status).toBe(401);
    expect(response.headers.get("www-authenticate")).toContain(`${ORIGIN}/.well-known/oauth-protected-resource/mcp`);
  });

  it("publishes the resource and the authorization server for this origin", async () => {
    const resource = await (await new Browser().fetch("/.well-known/oauth-protected-resource/mcp")).json();
    expect(resource).toMatchObject({ resource: `${ORIGIN}/mcp`, authorization_servers: [ORIGIN] });
    const server = await (await new Browser().fetch("/.well-known/oauth-authorization-server")).json();
    expect(server).toMatchObject({
      authorization_endpoint: `${ORIGIN}/authorize`,
      token_endpoint: `${ORIGIN}/oauth/token`,
      registration_endpoint: `${ORIGIN}/oauth/register`,
      code_challenge_methods_supported: ["S256"],
    });
  });
});

describe("consent", () => {
  it("sends a signed-out browser to sign in, and back to the same request afterwards", async () => {
    const client = await newClient();
    const response = await new Browser().fetch(client.authorizeUrl);
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(`/sign-in?next=${encodeURIComponent(client.authorizeUrl)}`);
  });

  it("returns the browser to the assistant with a code and its state", async () => {
    const { callback } = await connect("consent@example.com", "app:read", ["app:read"]);
    expect(callback.origin + callback.pathname).toBe(REDIRECT_URI);
    expect(callback.searchParams.get("state")).toBe("state-1");
    expect(callback.searchParams.get("code")).toBeTruthy();
  });

  it("works once per handle", async () => {
    const { browser } = await signIn("once@example.com");
    const client = await newClient();
    const handle = await beginConsent(browser, client.authorizeUrl);
    expect((await browser.postForm("/authorize", decision(handle, "approve", ["app:read"]))).status).toBe(200);
    expect((await browser.postForm("/authorize", decision(handle, "approve", ["app:read"]))).status).toBe(400);
  });

  it("cannot be approved by a different account than the one that started it", async () => {
    const starter = await signIn("starter@example.com");
    const other = await signIn("other@example.com");
    const client = await newClient();
    const handle = await beginConsent(starter.browser, client.authorizeUrl);
    expect((await other.browser.postForm("/authorize", decision(handle, "approve", ["app:read"]))).status).toBe(400);
    // The handle is still the starter's to use.
    expect((await starter.browser.postForm("/authorize", decision(handle, "approve", ["app:read"]))).status).toBe(200);
  });

  it("cannot be decided from another site, or without a session", async () => {
    const { browser } = await signIn("forge@example.com");
    const client = await newClient();
    const handle = await beginConsent(browser, client.authorizeUrl);
    const forged = await browser.postForm(
      "/authorize",
      decision(handle, "approve", ["app:read"]),
      "https://evil.example",
    );
    expect(forged.status).toBe(403);
    const signedOut = await new Browser().postForm("/authorize", decision(handle, "approve", ["app:read"]));
    expect(signedOut.status).toBe(401);
  });

  it("returns an error to the assistant when the person declines", async () => {
    const { browser } = await signIn("deny@example.com");
    const client = await newClient();
    const handle = await beginConsent(browser, client.authorizeUrl);
    const denied = await browser.postForm("/authorize", decision(handle, "deny", []));
    const callback = await callbackOf(denied);
    expect(callback.searchParams.get("error")).toBe("access_denied");
    expect(callback.searchParams.get("code")).toBeNull();
  });

  it("never grants more than the assistant asked for", async () => {
    const { tokens } = await connect("narrow@example.com", "app:read", ["app:read", "app:write", "offline_access"]);
    expect(tokens.scope?.split(" ")).toEqual(["app:read"]);
    expect(tokens.refresh_token).toBeUndefined();
  });

  it("issues a refresh token only when staying connected was allowed", async () => {
    const without = await connect("short@example.com", "app:read offline_access", ["app:read"]);
    expect(without.tokens.refresh_token).toBeUndefined();
    const withOffline = await connect("long@example.com", "app:read offline_access", ["app:read", "offline_access"]);
    expect(withOffline.tokens.refresh_token).toBeTruthy();
  });
});

describe("tools", () => {
  it("lists the contract procedures marked for this server and runs them as the connected person", async () => {
    const { userId, tokens } = await connect("tools@example.com", "app:read", ["app:read"]);
    const init = await mcp(tokens.access_token, {
      id: 1,
      method: "initialize",
      params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "test", version: "0" } },
    });
    expect(init.status).toBe(200);
    expect(init.message.result.serverInfo.name).toBe("Launchpad");

    const listed = await mcp(tokens.access_token, { id: 2, method: "tools/list", params: {} });
    const names = (listed.message.result.tools as { name: string }[]).map((tool) => tool.name).sort();
    expect(names).toEqual(["ping", "whoami"]);

    const who = await mcp(tokens.access_token, {
      id: 3,
      method: "tools/call",
      params: { name: "whoami", arguments: {} },
    });
    expect(who.message.result.isError).toBeFalsy();
    expect(JSON.stringify(who.message.result)).toContain(userId);
    expect(JSON.stringify(who.message.result)).toContain("tools@example.com");
  });

  it("refuses a made-up token", async () => {
    const response = await mcp("not-a-token", { id: 1, method: "tools/list", params: {} });
    expect(response.status).toBe(401);
  });

  it("refuses an authorization code used twice", async () => {
    const { client, code } = await connect("replay@example.com", "app:read", ["app:read"]);
    const replay = await client.exchange(code);
    expect(replay.status).toBe(400);
  });
});
