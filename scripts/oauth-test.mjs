#!/usr/bin/env node
// End-to-end check of the assistant connection, against a running local Worker:
//   sign in (an emailed code, or the local Access identity before launch) → register an OAuth
//   client → authorize → approve on the consent page → exchange the code → call the MCP
//   server → replay the code (must fail).
// Usage: npm run mcp:test [-- http://localhost:8787]
// Local only: it reads the sign-in code from the local D1 outbox.
import { execFileSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const origin = (process.argv[2] ?? "http://localhost:8787").replace(/\/$/, "");
const webDir = resolve(dirname(fileURLToPath(import.meta.url)), "../apps/web");
const email = `oauth-test-${Date.now()}@example.com`;
const redirectUri = "http://127.0.0.1:53682/callback";

const jar = new Map();
function keepCookies(response) {
  for (const line of response.headers.getSetCookie()) {
    const [pair, ...attributes] = line.split(";");
    const index = pair.indexOf("=");
    const name = pair.slice(0, index).trim();
    const expired = attributes.some((item) => /^\s*max-age=0\s*$/i.test(item));
    if (expired) jar.delete(name);
    else jar.set(name, pair.slice(index + 1).trim());
  }
}
const cookieHeader = () => [...jar].map(([name, value]) => `${name}=${value}`).join("; ");

async function call(path, init = {}) {
  const headers = new Headers(init.headers);
  if (init.cookies !== false && jar.size) headers.set("cookie", cookieHeader());
  const response = await fetch(path.startsWith("http") ? path : origin + path, {
    ...init,
    headers,
    redirect: "manual",
  });
  if (init.cookies !== false) keepCookies(response);
  return response;
}
const postJson = (path, body, init = {}) =>
  call(path, {
    ...init,
    method: "POST",
    headers: { "content-type": "application/json", origin, ...init.headers },
    body: JSON.stringify(body),
  });

let step = 0;
function ok(condition, label, detail = "") {
  step += 1;
  if (!condition) {
    console.error(`✗ ${step}. ${label}${detail ? `\n   ${detail}` : ""}`);
    process.exit(1);
  }
  console.log(`✓ ${step}. ${label}`);
}

function latestCode() {
  const out = execFileSync(
    "npx",
    [
      "wrangler",
      "d1",
      "execute",
      "DB",
      "--local",
      "--persist-to",
      ".wrangler/state",
      "--json",
      "--command",
      `select subject from email_outbox where recipient = '${email}' order by id desc limit 1`,
    ],
    { cwd: webDir, env: { ...process.env, CI: "1" }, stdio: ["ignore", "pipe", "ignore"] },
  );
  return /\d{6}/.exec(JSON.parse(out)[0].results[0].subject)[0];
}

/** One JSON-RPC call over Streamable HTTP. The answer may arrive as JSON or as one SSE event. */
async function mcp(token, body, sessionId) {
  const response = await call("/mcp", {
    method: "POST",
    cookies: false,
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      ...(sessionId ? { "mcp-session-id": sessionId } : {}),
    },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  let message = null;
  if (text) {
    const data = (response.headers.get("content-type") ?? "").includes("text/event-stream")
      ? text
          .split("\n")
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).trim())
          .pop()
      : text;
    message = data ? JSON.parse(data) : null;
  }
  return { status: response.status, message, sessionId: response.headers.get("mcp-session-id") ?? sessionId };
}

// --- discovery ---------------------------------------------------------------------------
const unauthenticated = await call("/mcp", {
  method: "POST",
  cookies: false,
  headers: { "content-type": "application/json" },
  body: "{}",
});
ok(
  unauthenticated.status === 401 &&
    (unauthenticated.headers.get("www-authenticate") ?? "").includes("resource_metadata"),
  "/mcp without a token answers 401 and points at the resource metadata",
  unauthenticated.headers.get("www-authenticate") ?? "",
);
const resource = await (await call("/.well-known/oauth-protected-resource/mcp", { cookies: false })).json();
ok(resource.resource === `${origin}/mcp`, "resource metadata names this server", JSON.stringify(resource));
const server = await (await call("/.well-known/oauth-authorization-server", { cookies: false })).json();
ok(
  server.authorization_endpoint === `${origin}/authorize` && server.token_endpoint === `${origin}/oauth/token`,
  "authorization server metadata lists the endpoints",
  JSON.stringify(server),
);

// --- register a client (as an assistant would, from another origin) ------------------------
const registered = await call("/oauth/register", {
  method: "POST",
  cookies: false,
  headers: { "content-type": "application/json", origin: "https://assistant.example" },
  body: JSON.stringify({
    client_name: "OAuth test client",
    redirect_uris: [redirectUri],
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
    token_endpoint_auth_method: "none",
  }),
});
const client = await registered.json();
ok(registered.status === 201 && client.client_id, "a client registers from another origin", JSON.stringify(client));

// --- authorize: signed out, then signed in ---------------------------------------------------
const verifier = randomBytes(32).toString("base64url");
const challenge = createHash("sha256").update(verifier).digest("base64url");
const state = randomBytes(8).toString("hex");
const authorizeUrl = `/authorize?${new URLSearchParams({
  response_type: "code",
  client_id: client.client_id,
  redirect_uri: redirectUri,
  scope: "app:read offline_access",
  state,
  code_challenge: challenge,
  code_challenge_method: "S256",
  resource: `${origin}/mcp`,
})}`;

const asBrowser = { headers: { accept: "text/html,application/xhtml+xml" } };
const { signIn: methods } = await (await call("/health", { cookies: false })).json();

let userId;
if (methods.emailCode) {
  const signedOut = await call(authorizeUrl, asBrowser);
  ok(
    signedOut.status === 302 && (signedOut.headers.get("location") ?? "").startsWith("/sign-in?next="),
    "authorize without a session sends the browser to sign in",
    `${signedOut.status} ${signedOut.headers.get("location")}`,
  );
  const sent = await postJson("/api/auth/email-otp/send-verification-otp", { email, type: "sign-in" });
  ok(sent.status === 200, "a sign-in code is sent", await sent.text());
  const signIn = await postJson("/api/auth/sign-in/email-otp", { email, otp: latestCode() });
  const session = await signIn.json();
  ok(signIn.status === 200 && session.user?.id, "the code from the outbox signs in", JSON.stringify(session));
  userId = session.user.id;
} else {
  // Before launch the Cloudflare Access email is the sign-in; locally that is DEV_ACCESS_EMAIL.
  const who = await call("/api/account/whoami");
  const me = await who.json();
  ok(
    who.status === 200 && me.id,
    `the local Access identity (${me.email}) is the signed-in person`,
    `${who.status}: set DEV_ACCESS_EMAIL in apps/web/.dev.vars`,
  );
  userId = me.id;
}

const began = await call(authorizeUrl, asBrowser);
const consentUrl = began.headers.get("location") ?? "";
ok(
  began.status === 303 && consentUrl.startsWith("/connect/consent?h="),
  "authorize with a session starts consent",
  `${began.status} ${consentUrl} ${await began.text()}`,
);
const handle = new URL(origin + consentUrl).searchParams.get("h");

const consentPage = await call(consentUrl, asBrowser);
const consentHtml = await consentPage.text();
ok(
  consentPage.status === 200 &&
    consentHtml.includes("OAuth test client") &&
    consentHtml.includes('action="/authorize"'),
  "the consent page renders the client and posts to /authorize",
  `${consentPage.status}`,
);

// --- another site cannot post the decision ---------------------------------------------------
const form = () =>
  new URLSearchParams([
    ["handle", handle],
    ["decision", "approve"],
    ["scope", "app:read"],
    ["scope", "offline_access"],
  ]);
const forged = await call("/authorize", {
  method: "POST",
  headers: { origin: "https://evil.example", "content-type": "application/x-www-form-urlencoded" },
  body: form(),
});
ok(forged.status === 403, "a consent decision posted from another site is refused", `${forged.status}`);

const approved = await call("/authorize", {
  method: "POST",
  headers: { origin, "content-type": "application/x-www-form-urlencoded" },
  body: form(),
});
const approvedHtml = await approved.text();
const back = /url=([^"]+)"/
  .exec(approvedHtml)?.[1]
  ?.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
const callback = back ? new URL(back) : null;
ok(
  approved.status === 200 && callback?.searchParams.get("code") && callback.searchParams.get("state") === state,
  "approving returns the browser to the client with a code and the same state",
  `${approved.status} ${approvedHtml.slice(0, 300)}`,
);
const code = callback.searchParams.get("code");

const reused = await call("/authorize", {
  method: "POST",
  headers: { origin, "content-type": "application/x-www-form-urlencoded" },
  body: form(),
});
ok(reused.status === 400, "the consent handle works only once", `${reused.status}`);

// --- token exchange and MCP calls -----------------------------------------------------------
const exchange = () =>
  call("/oauth/token", {
    method: "POST",
    cookies: false,
    headers: { "content-type": "application/x-www-form-urlencoded", origin: "https://assistant.example" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: client.client_id,
      code_verifier: verifier,
      resource: `${origin}/mcp`,
    }),
  });
const tokenResponse = await exchange();
const tokens = await tokenResponse.json();
ok(
  tokenResponse.status === 200 && tokens.access_token && tokens.refresh_token,
  "the code is exchanged for tokens, with a refresh token because offline_access was granted",
  JSON.stringify(tokens).slice(0, 300),
);

const init = await mcp(tokens.access_token, {
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "oauth-test", version: "0" } },
});
ok(init.status === 200 && init.message?.result?.serverInfo?.name, "the MCP server initializes", JSON.stringify(init));
await mcp(tokens.access_token, { jsonrpc: "2.0", method: "notifications/initialized" }, init.sessionId);

const listed = await mcp(
  tokens.access_token,
  { jsonrpc: "2.0", id: 2, method: "tools/list", params: {} },
  init.sessionId,
);
const toolNames = (listed.message?.result?.tools ?? []).map((tool) => tool.name);
ok(
  toolNames.length === 2,
  `tools/list returns the contract's two tools (${toolNames.join(", ")})`,
  JSON.stringify(listed),
);

const whoamiTool = toolNames.find((name) => /whoami/i.test(name));
const called = await mcp(
  tokens.access_token,
  { jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: whoamiTool, arguments: {} } },
  init.sessionId,
);
ok(
  JSON.stringify(called.message?.result ?? {}).includes(userId),
  "whoami over MCP returns the signed-in person's id",
  JSON.stringify(called),
);

const refreshed = await call("/oauth/token", {
  method: "POST",
  cookies: false,
  headers: { "content-type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: tokens.refresh_token,
    client_id: client.client_id,
  }),
});
ok(
  refreshed.status === 200 && (await refreshed.json()).access_token,
  "the refresh token gets a new access token",
  `${refreshed.status}`,
);

const replay = await exchange();
ok(replay.status >= 400, "replaying the authorization code is refused", `${replay.status} ${await replay.text()}`);

console.log(`\nAll ${step} checks passed against ${origin}.`);
