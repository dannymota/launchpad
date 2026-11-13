// Every table, one file per feature. `npm run db:generate` turns changes here into SQL
// under packages/backend/migrations; never edit that SQL by hand.
export * from "./auth";
export * from "./email";
export * from "./mcp";
