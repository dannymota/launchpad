// The spending ledger. Before a model call, `reserve` writes the most it could cost; the
// insert only happens while the month's total, with that amount added, stays inside the
// budget. After the call, `settle` replaces the amount with what it did cost. So the total
// can run ahead of real spending but never behind it, and the budget cannot be overshot by
// calls racing each other: the check and the write are one statement.
import { and, eq, sql } from "drizzle-orm";
import { UserError } from "../../core/errors";
import { getDb, schema } from "../../db/client";
import type { Env } from "../../env";

const usage = schema.ai_usage;

export const monthOf = (date = new Date()) => date.toISOString().slice(0, 7);

export interface Reservation {
  id: string;
  month: string;
}

export interface Budget {
  budgetMicros: number;
  personMicros: number;
}

async function spent(env: Env, month: string, userId?: string): Promise<number> {
  const [row] = await getDb(env)
    .select({ total: sql<number>`coalesce(sum(${usage.micros}), 0)` })
    .from(usage)
    .where(userId ? and(eq(usage.month, month), eq(usage.user_id, userId)) : eq(usage.month, month));
  return row?.total ?? 0;
}

/**
 * Holds `micros` against this month's budget for a call about to be made. Refuses when the
 * product's budget, or this person's share of it, has no room left.
 */
export async function reserve(
  env: Env,
  call: { userId: string; model: string; micros: number } & Budget,
): Promise<Reservation> {
  const id = crypto.randomUUID();
  const month = monthOf();
  const total = sql`(select coalesce(sum(${usage.micros}), 0) from ${usage} where ${usage.month} = ${month})`;
  const mine = sql`(select coalesce(sum(${usage.micros}), 0) from ${usage} where ${usage.month} = ${month} and ${usage.user_id} = ${call.userId})`;
  const written = await getDb(env).all<{ id: string }>(sql`
    insert into ${usage} (id, user_id, month, model, micros, state)
    select ${id}, ${call.userId}, ${month}, ${call.model}, ${call.micros}, 'reserved'
    where ${total} + ${call.micros} <= ${call.budgetMicros}
      and ${mine} + ${call.micros} <= ${call.personMicros}
    returning id`);
  if (written.length > 0) return { id, month };

  const personal = (await spent(env, month, call.userId)) + call.micros > call.personMicros;
  throw new UserError(
    429,
    personal ? "ai_person_budget" : "ai_budget",
    personal
      ? "You have used your share of this month's AI budget. It resets on the 1st."
      : "This month's AI budget is used up. It resets on the 1st.",
  );
}

/** Records what the call did cost, in place of what was held for it. */
export async function settle(
  env: Env,
  reservation: Reservation,
  actual: { micros: number; inputTokens: number; outputTokens: number },
): Promise<void> {
  await getDb(env)
    .update(usage)
    .set({
      micros: actual.micros,
      state: "settled",
      input_tokens: actual.inputTokens,
      output_tokens: actual.outputTokens,
    })
    .where(eq(usage.id, reservation.id));
}

/** Gives back what was held for a call that never ran (the API refused or could not be reached). */
export async function release(env: Env, reservation: Reservation): Promise<void> {
  await getDb(env).delete(usage).where(eq(usage.id, reservation.id));
}

/**
 * What a person has used of their share this month, and whether a call needing `needMicros`
 * held for it would be accepted now.
 */
export async function budgetFor(
  env: Env,
  userId: string,
  budget: Budget & { needMicros: number },
): Promise<{ month: string; usedMicros: number; limitMicros: number; open: boolean }> {
  const month = monthOf();
  const [total, mine] = await Promise.all([spent(env, month), spent(env, month, userId)]);
  return {
    month,
    usedMicros: mine,
    limitMicros: budget.personMicros,
    open: total + budget.needMicros <= budget.budgetMicros && mine + budget.needMicros <= budget.personMicros,
  };
}
