// What this MCP server exposes, and under which permission.
//
// A procedure from the API contract becomes a tool only when it is listed in TOOLS. The
// key is the procedure's path in the contract; the value is the scope a connection must
// hold to call it. Tool names and descriptions come from the contract itself; the scopes
// and their consent-screen sentences live in packages/shared/src/assistant-scopes.ts.
import type { Scope } from "@app/shared";

export const SERVER_NAME = "Launchpad";
export const SERVER_VERSION = "0.1.0";
export const ROUTE = "/mcp";

export const TOOLS: Record<string, Scope> = {
  "system.ping": "app:read",
  "account.whoami": "app:read",
};
