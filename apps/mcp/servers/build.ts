// Builds one MCP server for one request. Its tools are the contract procedures the server's
// definition lists, registered by oRPC, so a tool call runs the same code as the web and
// mobile apps, with the same validation. A connection sees only the tools its scopes allow.
import { apiContext, assistantPrincipal, type Env, productOf, router } from "@app/backend";
import { McpServer } from "@modelcontextprotocol/server";
import { McpRegistrar } from "@orpc/mcp";
import type { McpServerDefinition } from "./registry";

export interface Connection {
  userId: string;
  scopes: string[];
}

const toolsFor = (definition: McpServerDefinition, allowed: (scope: string) => boolean) =>
  new McpRegistrar(router, {
    filter: (_procedure, path) => {
      const key = path.join(".");
      return Object.hasOwn(definition.tools, key) && allowed(definition.tools[key] as string);
    },
  });

export async function buildServer(
  env: Env,
  definition: McpServerDefinition,
  connection: Connection,
): Promise<McpServer> {
  const server = new McpServer({ name: definition.name ?? productOf(env).name, version: definition.version });
  await toolsFor(definition, (scope) => connection.scopes.includes(scope)).register(server, {
    context: () => apiContext(env, () => assistantPrincipal(env, connection.userId, connection.scopes)),
  });
  return server;
}

const scopeByTool = new Map<McpServerDefinition, Promise<Map<string, string>>>();

/**
 * Tool name → the scope it needs, for every tool the server has, granted or not. Worked out
 * once per server by registering each scope's tools on a throwaway server and reading the names.
 */
export function toolScopes(definition: McpServerDefinition): Promise<Map<string, string>> {
  let known = scopeByTool.get(definition);
  if (!known) {
    known = (async () => {
      const names = new Map<string, string>();
      for (const scope of new Set(Object.values(definition.tools))) {
        const scratch = new McpServer({ name: definition.name ?? definition.route, version: definition.version });
        const { tools } = await toolsFor(definition, (candidate) => candidate === scope).register(scratch, {
          context: () => {
            throw new Error("This server only lists tools; it never runs one.");
          },
        });
        for (const name of Object.keys(tools)) names.set(name, scope);
      }
      return names;
    })();
    scopeByTool.set(definition, known);
  }
  return known;
}
