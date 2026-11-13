import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { auth_user } from "./auth";

/**
 * One row per consent screen in progress. The handle the OAuth provider issued is bound to
 * the signed-in person here, so a handle started by one account cannot be approved by another.
 * Single use: approving or declining deletes the row.
 */
export const consent_identity = sqliteTable("consent_identity", {
  handle_hash: text("handle_hash").primaryKey(),
  user_id: text("user_id")
    .notNull()
    .references(() => auth_user.id, { onDelete: "cascade" }),
  client_name: text("client_name").notNull(),
  /** The client's verified domain when it identifies itself by a metadata document, else empty. */
  client_domain: text("client_domain").notNull().default(""),
  redirect_host: text("redirect_host").notNull(),
  /** JSON array of the scopes the client asked for. */
  scope: text("scope").notNull(),
  expires_at: integer("expires_at").notNull(),
});

/** An assistant a person connected: what the "Connected assistants" page lists and revokes. */
export const assistant_grants = sqliteTable(
  "assistant_grants",
  {
    id: text("id").primaryKey(),
    user_id: text("user_id")
      .notNull()
      .references(() => auth_user.id, { onDelete: "cascade" }),
    client_id: text("client_id").notNull(),
    client_name: text("client_name").notNull(),
    /** JSON array of granted scopes. */
    scope: text("scope").notNull(),
    created_at: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    last_used_at: integer("last_used_at", { mode: "timestamp_ms" }),
    revoked_at: integer("revoked_at", { mode: "timestamp_ms" }),
  },
  (table) => [index("assistant_grants_user_id_idx").on(table.user_id)],
);
