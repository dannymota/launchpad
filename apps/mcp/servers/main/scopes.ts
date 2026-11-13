// The product's MCP server: what it exposes, and under which permission.
//
// A procedure from the API contract becomes a tool only when it is listed in `tools`. The
// key is the procedure's path in the contract; the value is the scope a connection must
// hold to call it. Tool names and descriptions come from the contract itself; the scopes
// and their consent-screen sentences live in packages/shared/src/assistant-scopes.ts.
import type { McpServerDefinition } from "../registry";

export const main: McpServerDefinition = {
  route: "/mcp",
  name: "Launchpad",
  version: "0.1.0",
  tools: {
    "system.ping": "app:read",
    "account.whoami": "app:read",
  },
};
