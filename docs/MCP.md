# MCP: connecting assistants

The product's MCP server lets an AI assistant act for a signed-in person. It is served by the same
Worker as everything else, at `/mcp`, behind OAuth 2.1.

## Adding a tool

A tool is an API procedure. Define the procedure once in `packages/shared/src/contract` and
implement it in `packages/backend/src/api/router.ts`, then list it in
`apps/mcp/servers/main/scopes.ts` with the scope it needs:

```ts
tools: {
  "account.whoami": "app:read",
  "projects.create": "app:write",
}
```

The tool's name is the procedure's `operationId`; its description and input schema come from the
contract. A procedure that is not listed is not a tool. Procedures that use the `inPerson`
middleware (deleting the account, managing sessions and connections) refuse assistants even if
someone lists them.

Scopes and the sentence each shows on the consent page are in
`packages/shared/src/assistant-scopes.ts`.

## How a connection works

1. The assistant registers itself (`/oauth/register`, or a client metadata document URL) and sends
   the person's browser to `/authorize`.
2. The Worker's router identifies the person: the Cloudflare Access email before launch, a session
   after. Nobody signed in is sent to sign-in and returned.
3. `/authorize` binds a single-use consent handle to that person and shows `/connect/consent`. The
   person chooses what to allow. The decision is a form post from this site only.
4. The assistant exchanges the code for tokens. A refresh token is issued only if the person
   allowed "stay connected".
5. Every MCP call and every refresh checks the connection's row in D1. Ending a connection there
   takes effect at once.

## What ends a connection

| Event                                    | Effect                                                                |
| ---------------------------------------- | --------------------------------------------------------------------- |
| The person disconnects it in Settings    | Ends at once                                                          |
| The same app connects again              | The earlier connection ends; the new one replaces it                  |
| The account is deleted or banned         | Every connection ends                                                 |
| An authorization code is presented twice | The connection it created ends (the tokens may be in the wrong hands) |

The OAuth provider keeps its own records in KV. Those are deleted by the daily job; nothing waits
for that, because D1 is what is checked.

## Access

The MCP endpoints follow the product: internal while the product is internal. An assistant cannot
get through Cloudflare Access, so before launch set the endpoints public in
`product/product.config.ts` if you want to connect one:

```ts
access: { preset: "private", areas: { mcp: { visibility: "public" } } },
```

The consent step stays behind Access, so only people Access lets in can connect an assistant.

## More than one server

Add a folder beside `apps/mcp/servers/main` that exports a `McpServerDefinition`, and add it to
`apps/mcp/servers/index.ts`. Its route must be under `/mcp` (for example `/mcp/admin`).

All servers share one OAuth resource, `<origin>/mcp`: one connection reaches all of them, and
scopes decide which tools it gets on each. An MCP client that insists the resource it was given
matches the exact server address will not accept a second server at `/mcp/<name>`; for that, run
the second server in its own Worker.

## Checking it

```bash
npm run mcp:test
```

runs the whole flow against a local Worker. `apps/web/tests/mcp.workers.test.ts` covers the rules
above on the Workers runtime.
