// Connecting an assistant, proven on the Workers runtime: discovery, client registration,
// consent bound to the signed-in person, token exchange, and API procedures called as MCP tools.
import { beforeAll, describe, expect, it } from "vitest";
import { Browser, env, migrate, ORIGIN, signIn } from "./harness";
import type { ProductName } from "./products";
import { mcp as mcpSurface } from "./worker-entry";

const REDIRECT_URI = "http://127.0.0.1:53682/callback";
const ASSISTANT = "https://assistant.example";

beforeAll(migrate);

const base64url = (bytes: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(bytes as ArrayBuffer)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

/** An assistant: it registers itself and holds the PKCE secret for one authorization. */
async function newClient(scope = "app:read offline_access", product?: ProductName, name = "Test assistant") {
  const machine = new Browser({ product });
  const registered = await machine.fetch("/oauth/register", {
    method: "POST",
    headers: { "content-type": "application/json", origin: ASSISTANT },
    body: JSON.stringify({
      client_name: name,
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
  const response = await browser.page(authorizeUrl);
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
async function mcp(token: string, body: Record<string, unknown>, product?: ProductName, route = "/mcp") {
  const response = await new Browser({ product }).fetch(route, {
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
  const message = data && response.status < 400 ? (JSON.parse(data) as any) : null;
  return { status: response.status, message, challenge: response.headers.get("www-authenticate") ?? "" };
}

/** Signs in, connects a new assistant with `granted` scopes, and returns its tokens. */
async function connect(email: string, requested: string, granted: string[], appName?: string, as?: Browser) {
  const { browser, userId } = as ? { browser: as, userId: "" } : await signIn(email);
  const client = await newClient(requested, undefined, appName);
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
    const response = await new Browser().page(client.authorizeUrl);
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
    expect(init.message.result.serverInfo.name).toBe("Test Product");

    const listed = await mcp(tokens.access_token, { id: 2, method: "tools/list", params: {} });
    const names = (listed.message.result.tools as { name: string }[]).map((tool) => tool.name).sort();
    // At least the two the template ships; a product lists its own beside them.
    expect(names).toEqual(expect.arrayContaining(["ping", "whoami"]));

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

describe("before launch", () => {
  const whoami = { id: 1, method: "tools/call", params: { name: "whoami", arguments: {} } };

  it("connects an assistant for the person Cloudflare Access verified, with no second sign-in", async () => {
    const product = "private-mcp-public";
    const person = new Browser({ product, accessEmail: "founder-mcp@example.com" });
    const { id } = (await (await person.fetch("/api/account/whoami")).json()) as { id: string };
    const client = await newClient("app:read", product);
    const handle = await beginConsent(person, client.authorizeUrl);
    const approved = await person.postForm("/authorize", decision(handle, "approve", ["app:read"]));
    const code = (await callbackOf(approved)).searchParams.get("code") ?? "";
    const tokens = (await (await client.exchange(code)).json()) as { access_token: string };
    const who = await mcp(tokens.access_token, whoami, product);
    expect(JSON.stringify(who.message.result)).toContain(id);
  });

  it("keeps the consent step behind Access even when the MCP endpoints are public", async () => {
    const product = "private-mcp-public";
    const client = await newClient("app:read", product);
    const outsider = new Browser({ product });
    expect((await outsider.page(client.authorizeUrl)).status).toBe(404);
    expect((await outsider.postForm("/authorize", decision("any", "approve", ["app:read"]))).status).toBe(404);
    expect((await outsider.fetch("/.well-known/oauth-authorization-server")).status).toBe(200);
  });

  it("hides the MCP endpoints too, unless the product config opens them", async () => {
    const outsider = new Browser({ product: "private" });
    for (const path of ["/mcp", "/oauth/register", "/oauth/token"]) {
      expect((await outsider.post(path, {})).status, path).toBe(404);
    }
    expect((await outsider.fetch("/.well-known/oauth-protected-resource/mcp")).status).toBe(404);
  });
});

describe("when the account goes", () => {
  it("a deleted account's assistant stops working at once", async () => {
    const { browser, tokens } = await connect("leaving-mcp@example.com", "app:read offline_access", [
      "app:read",
      "offline_access",
    ]);
    expect((await mcp(tokens.access_token, { id: 1, method: "tools/list", params: {} })).status).toBe(200);
    expect((await browser.post("/api/account/delete", { confirm: "delete my account" })).status).toBe(200);
    expect((await mcp(tokens.access_token, { id: 2, method: "tools/list", params: {} })).status).toBe(401);
  });

  it("a banned account's assistant stops working at once, and cannot refresh", async () => {
    const { userId, client, tokens } = await connect("banned-mcp@example.com", "app:read offline_access", [
      "app:read",
      "offline_access",
    ]);
    const admin = new Browser({ accessEmail: "admin@example.com" });
    expect((await admin.post("/api/admin/users/ban", { userId, banned: true })).status).toBe(200);
    expect((await mcp(tokens.access_token, { id: 1, method: "tools/list", params: {} })).status).toBe(401);
    const refresh = await new Browser().fetch("/oauth/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: tokens.refresh_token ?? "",
        client_id: client.clientId,
      }),
    });
    expect(refresh.status).toBe(400);
  });
});

const listTools = { id: 1, method: "tools/list", params: {} };
const toolNames = (result: { message: { result: { tools: { name: string }[] } } }) =>
  result.message.result.tools.map((tool) => tool.name).sort();
const assistants = async (browser: Browser) =>
  (
    (await (await browser.fetch("/api/account/assistants")).json()) as {
      assistants: { id: string; name: string; lastUsedAt: string | null }[];
    }
  ).assistants;

describe("more than one server", () => {
  it("serves each at its own route with the same connection, offering only the tools its scopes allow", async () => {
    const reader = await connect("reader@example.com", "app:read", ["app:read"]);
    expect(toolNames(await mcp(reader.tokens.access_token, listTools))).toEqual(
      expect.arrayContaining(["ping", "whoami"]),
    );
    // A server with nothing to offer this connection has no tools at all, so it says it has no such method.
    const nothing = await mcp(reader.tokens.access_token, listTools, undefined, "/mcp/writer");
    expect(nothing.message.result?.tools ?? []).toEqual([]);
    expect(nothing.message.error?.message).toBe("Method not found");

    const writer = await connect("writer@example.com", "app:read app:write", ["app:read", "app:write"]);
    expect(toolNames(await mcp(writer.tokens.access_token, listTools, undefined, "/mcp/writer"))).toEqual(["ping"]);
  });

  it("answers a call to a tool the connection was not allowed with a challenge naming the missing permission", async () => {
    const { tokens } = await connect("challenged@example.com", "app:read", ["app:read"]);
    const call = { id: 2, method: "tools/call", params: { name: "ping", arguments: {} } };
    const refused = await mcp(tokens.access_token, call, undefined, "/mcp/writer");
    expect(refused.status).toBe(403);
    expect(refused.challenge).toContain('error="insufficient_scope"');
    expect(refused.challenge).toContain('scope="app:write"');
    // The same tool name on the main server needs only app:read, which this connection has.
    expect((await mcp(tokens.access_token, call)).status).toBe(200);
  });

  it("requires a token at every server route", async () => {
    const response = await new Browser().post("/mcp/writer", {});
    expect(response.status).toBe(401);
  });
});

describe("connected assistants", () => {
  it("lists a person's connections and notes when one was last used", async () => {
    const { browser, tokens } = await connect("lister@example.com", "app:read", ["app:read"], "Notes app");
    const before = await assistants(browser);
    expect(before).toMatchObject([{ name: "Notes app", lastUsedAt: null }]);
    await mcp(tokens.access_token, listTools);
    const after = await assistants(browser);
    expect(after[0]?.lastUsedAt).toBeTruthy();
  });

  it("disconnects one when the person says so, at once", async () => {
    const { browser, tokens } = await connect("disconnector@example.com", "app:read", ["app:read"]);
    const [assistant] = await assistants(browser);
    expect((await browser.post("/api/account/assistants/revoke", { id: assistant?.id })).status).toBe(200);
    expect((await mcp(tokens.access_token, listTools)).status).toBe(401);
    expect(await assistants(browser)).toEqual([]);
  });

  it("cannot disconnect someone else's", async () => {
    const owner = await connect("grant-owner@example.com", "app:read", ["app:read"]);
    const [assistant] = await assistants(owner.browser);
    const other = await signIn("grant-meddler@example.com");
    await other.browser.post("/api/account/assistants/revoke", { id: assistant?.id });
    expect((await mcp(owner.tokens.access_token, listTools)).status).toBe(200);
  });

  it("replaces the earlier connection when the same app connects again", async () => {
    const first = await connect("reconnector@example.com", "app:read", ["app:read"], "Editor");
    const second = await connect("reconnector@example.com", "app:read", ["app:read"], "Editor", first.browser);
    expect(second.client.clientId).not.toBe(first.client.clientId);
    expect((await mcp(first.tokens.access_token, listTools)).status).toBe(401);
    expect((await mcp(second.tokens.access_token, listTools)).status).toBe(200);
    expect(await assistants(first.browser)).toHaveLength(1);
  });

  it("keeps different apps side by side", async () => {
    const first = await connect("two-apps@example.com", "app:read", ["app:read"], "Editor");
    const second = await connect("two-apps@example.com", "app:read", ["app:read"], "Terminal", first.browser);
    expect((await mcp(first.tokens.access_token, listTools)).status).toBe(200);
    expect((await mcp(second.tokens.access_token, listTools)).status).toBe(200);
    expect((await assistants(first.browser)).map((item) => item.name).sort()).toEqual(["Editor", "Terminal"]);
  });

  it("are not something an assistant can list or disconnect for itself", async () => {
    const { tokens } = await connect("self-serve@example.com", "app:read app:write", ["app:read", "app:write"]);
    const names = toolNames(await mcp(tokens.access_token, listTools));
    expect(names).not.toContain("listAssistants");
    expect(names).not.toContain("revokeAssistant");
    expect(names).not.toContain("deleteAccount");
  });
});

describe("a replayed authorization code", () => {
  it("ends the connection the first use created", async () => {
    const { browser, client, code, tokens } = await connect("replayed@example.com", "app:read offline_access", [
      "app:read",
      "offline_access",
    ]);
    expect((await mcp(tokens.access_token, listTools)).status).toBe(200);
    expect((await client.exchange(code)).status).toBe(400);
    expect((await mcp(tokens.access_token, listTools)).status).toBe(401);
    expect(await assistants(browser)).toEqual([]);
  });

  it("does not let a made-up code end anyone's connection", async () => {
    const { userId, client, tokens } = await connect("not-replayed@example.com", "app:read", ["app:read"]);
    const row = await env.DB.prepare("select provider_grant_id from assistant_grants where user_id = ?")
      .bind(userId)
      .first<{ provider_grant_id: string }>();
    // The right user and grant ids, but a secret the provider never issued.
    expect((await client.exchange(`${userId}:${row?.provider_grant_id}:forged-secret`)).status).toBe(400);
    expect((await mcp(tokens.access_token, listTools)).status).toBe(200);
  });
});

describe("the daily sweep", () => {
  it("deletes the stored tokens of connections that have ended, and leaves live ones", async () => {
    const gone = await connect("swept@example.com", "app:read", ["app:read"], "Old app");
    const kept = await connect("kept@example.com", "app:read", ["app:read"], "Live app");
    const [assistant] = await assistants(gone.browser);
    await gone.browser.post("/api/account/assistants/revoke", { id: assistant?.id });

    const stored = async (userId: string) => (await env.OAUTH_KV.list({ prefix: `grant:${userId}:` })).keys.length;
    expect(await stored(gone.userId)).toBe(1);
    await mcpSurface.sweep(env, ORIGIN);
    expect(await stored(gone.userId)).toBe(0);
    expect(await stored(kept.userId)).toBe(1);
    expect((await mcp(kept.tokens.access_token, listTools)).status).toBe(200);
  });
});
