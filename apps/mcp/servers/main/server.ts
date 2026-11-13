// Builds this MCP server for one request. Its tools are the contract procedures listed in
// scopes.ts, registered by oRPC, so a tool call runs the same code as the web and mobile
// apps, with the same validation.
import { apiContext, assistantPrincipal, type Env, router } from "@app/backend";
import { McpServer } from "@modelcontextprotocol/server";
import { McpRegistrar } from "@orpc/mcp";
import { SERVER_NAME, SERVER_VERSION, TOOLS } from "./scopes";

const registrar = new McpRegistrar(router, {
  filter: (_procedure, path) => Object.hasOwn(TOOLS, path.join(".")),
});

export interface Connection {
  userId: string;
  scopes: string[];
}

export async function createServer(env: Env, connection: Connection): Promise<McpServer> {
  const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION });
  await registrar.register(server, {
    context: () => apiContext(env, () => assistantPrincipal(env, connection.userId, connection.scopes)),
  });
  return server;
}
