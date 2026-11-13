import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * Attempt counters for sign-in and other limited actions. The bucket is a keyed hash of the
 * action and who is acting (an address, an email), so reading this table reveals neither.
 */
export const rate_limits = sqliteTable("rate_limits", {
  bucket: text("bucket").primaryKey(),
  window_started_at: integer("window_started_at").notNull(),
  attempts: integer("attempts").notNull(),
});
