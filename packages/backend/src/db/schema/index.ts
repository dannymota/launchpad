// Every table, one file per feature. `npm run db:generate` turns changes here into SQL
// under packages/backend/migrations; never edit that SQL by hand.
// >>> ai
export * from "./ai";
// <<< ai
export * from "./auth";
export * from "./email";
// >>> mcp
export * from "./mcp";
// <<< mcp
export * from "./safety";
