import { relations, sql } from "drizzle-orm";
import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

export const auth_user = sqliteTable("auth_user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  email_verified: integer("email_verified", { mode: "boolean" })
    .default(false)
    .notNull(),
  image: text("image"),
  created_at: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
  updated_at: integer("updated_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const auth_session = sqliteTable(
  "auth_session",
  {
    id: text("id").primaryKey(),
    expires_at: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    token: text("token").notNull().unique(),
    created_at: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updated_at: integer("updated_at", { mode: "timestamp_ms" })
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ip_address: text("ip_address"),
    user_agent: text("user_agent"),
    user_id: text("user_id")
      .notNull()
      .references(() => auth_user.id, { onDelete: "cascade" }),
  },
  (table) => [index("auth_session_user_id_idx").on(table.user_id)],
);

export const auth_account = sqliteTable(
  "auth_account",
  {
    id: text("id").primaryKey(),
    account_id: text("account_id").notNull(),
    provider_id: text("provider_id").notNull(),
    user_id: text("user_id")
      .notNull()
      .references(() => auth_user.id, { onDelete: "cascade" }),
    access_token: text("access_token"),
    refresh_token: text("refresh_token"),
    id_token: text("id_token"),
    access_token_expires_at: integer("access_token_expires_at", {
      mode: "timestamp_ms",
    }),
    refresh_token_expires_at: integer("refresh_token_expires_at", {
      mode: "timestamp_ms",
    }),
    scope: text("scope"),
    password: text("password"),
    created_at: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updated_at: integer("updated_at", { mode: "timestamp_ms" })
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("auth_account_user_id_idx").on(table.user_id)],
);

export const auth_verification = sqliteTable(
  "auth_verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expires_at: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    created_at: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updated_at: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("auth_verification_identifier_idx").on(table.identifier)],
);

export const auth_userRelations = relations(auth_user, ({ many }) => ({
  auth_sessions: many(auth_session),
  auth_accounts: many(auth_account),
}));

export const auth_sessionRelations = relations(auth_session, ({ one }) => ({
  auth_user: one(auth_user, {
    fields: [auth_session.user_id],
    references: [auth_user.id],
  }),
}));

export const auth_accountRelations = relations(auth_account, ({ one }) => ({
  auth_user: one(auth_user, {
    fields: [auth_account.user_id],
    references: [auth_user.id],
  }),
}));
