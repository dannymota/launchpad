// What an MCP server is, to this app: a route, a name, and the contract procedures it
// exposes as tools with the scope each one needs. A server is a folder under servers/ that
// exports one of these, plus one line in servers/index.ts.
import type { Scope } from "@app/shared";

export interface McpServerDefinition {
  /** "/mcp", or a path under it such as "/mcp/admin". The access map's mcp area covers them all. */
  route: string;
  /** Shown to the person by their assistant. */
  /** What assistants see the server called. Defaults to the product's name. */
  name?: string;
  version: string;
  /**
   * Contract procedure path → the scope a connection must hold to call it. A procedure is a
   * tool only when it is listed here; its name and description come from the contract.
   */
  tools: Record<string, Scope>;
}

const ROOT = "/mcp";

/** Checks a set of servers at start-up: routes under /mcp, none repeated. */
export function defineServers(servers: McpServerDefinition[]): McpServerDefinition[] {
  const seen = new Set<string>();
  for (const server of servers) {
    if (server.route !== ROOT && !server.route.startsWith(`${ROOT}/`)) {
      throw new Error(`The MCP server at ${server.route} must be served at ${ROOT} or under it.`);
    }
    if (server.route.endsWith("/") || seen.has(server.route)) {
      throw new Error(`MCP server route ${server.route} is repeated or ends with a slash.`);
    }
    seen.add(server.route);
  }
  // Longest first, so "/mcp/admin" is matched before "/mcp".
  return [...servers].sort((a, b) => b.route.length - a.route.length);
}

export const MCP_ROOT = ROOT;
