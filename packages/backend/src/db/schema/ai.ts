import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { auth_user } from "./auth";

/**
 * The AI spending ledger: one row per model call. A call is written before it is made, at
 * the most it could cost, and corrected to what it did cost when it ends. The month's rows
 * add up to what counts against the budget.
 */
export const ai_usage = sqliteTable(
  "ai_usage",
  {
    id: text("id").primaryKey(),
    /** Null once the account is deleted: what it spent still counts toward the month. */
    user_id: text("user_id").references(() => auth_user.id, { onDelete: "set null" }),
    /** The calendar month (UTC) the call counts toward, e.g. "2026-11". */
    month: text("month").notNull(),
    model: text("model").notNull(),
    /** Millionths of a dollar: the most the call could cost while "reserved", its real cost once "settled". */
    micros: integer("micros").notNull(),
    /** "reserved" | "settled". A failed call's row is deleted. */
    state: text("state").notNull(),
    input_tokens: integer("input_tokens"),
    output_tokens: integer("output_tokens"),
    created_at: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (table) => [index("ai_usage_month_user_idx").on(table.month, table.user_id)],
);
