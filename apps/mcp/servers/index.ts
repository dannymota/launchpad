// Every MCP server this product serves. To add one: a folder beside main/ exporting a
// McpServerDefinition, and a line here.
import { main } from "./main/scopes";
import { defineServers } from "./registry";

export const SERVERS = defineServers([main]);
