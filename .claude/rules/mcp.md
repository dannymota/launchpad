---
paths:
  - "apps/mcp/**"
---

# MCP servers

- **A tool is a contract procedure, not new code.** Define the action in
  `packages/shared/src/contract`, implement it in `packages/backend/src/api/router.ts`, then list it
  in the server's `scopes.ts` with the scope it needs. Its name, description and input schema come
  from the contract, so write the contract's `summary` and `description` for a model to read.
- **Every tool names a scope.** A read is `app:read`; anything that changes data needs a write scope.
  A connection is only offered the tools its granted scopes allow.
- **A procedure only the person may run uses `inPerson`**, which refuses an assistant. Account
  deletion, session and assistant management stay that way.
- **A second server is a folder** under `servers/` plus one line in `servers/index.ts`. All servers
  share one OAuth resource.
- **Do not touch the database or KV from here.** Grants and consent live in
  `packages/backend/src/accounts/assistants.ts`.
- Check with `npm run test:workers` and, against a running local Worker, `npm run mcp:test`.
  `docs/MCP.md` explains the connection flow.
