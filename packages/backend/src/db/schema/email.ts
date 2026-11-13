import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * Mail that was not sent because no sender is configured (local dev, tests, a product with
 * no sending domain yet). Sign-in codes land here, so the flow works end to end without
 * email. Never written when the Email Service binding and EMAIL_FROM are both set.
 */
export const email_outbox = sqliteTable("email_outbox", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  recipient: text("recipient").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  created_at: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
});
