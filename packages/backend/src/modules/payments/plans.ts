// Plans, as the server sees them. The product config names the plans and what people read
// about them; the Stripe price behind each paid plan is a Worker variable
// (STRIPE_PRICE_<PLAN ID>), so staging can use test prices and production live ones.
import { and, desc, eq, inArray } from "drizzle-orm";
import { productOf } from "../../core/product";
import { getDb, schema } from "../../db/client";
import type { Env } from "../../env";

const ACTIVE = ["active", "trialing"];

export function priceIdFor(env: Env, planId: string): string | undefined {
  const value = (env as unknown as Record<string, unknown>)[
    `STRIPE_PRICE_${planId.toUpperCase().replaceAll("-", "_")}`
  ];
  return typeof value === "string" && value ? value : undefined;
}

/** Paid plans that have a Stripe price set, in the shape the Stripe plugin takes. */
export function stripePlans(env: Env): { name: string; priceId: string }[] {
  return (productOf(env).plans ?? []).flatMap((plan) => {
    const priceId = plan.paid ? priceIdFor(env, plan.id) : undefined;
    return priceId ? [{ name: plan.id, priceId }] : [];
  });
}

/** The free plan's id: the first plan that is not paid, or "free" when the config lists none. */
export function freePlanId(env: Env): string {
  return (productOf(env).plans ?? []).find((plan) => !plan.paid)?.id ?? "free";
}

export interface CurrentPlan {
  plan: string;
  /** "none" on the free plan. Otherwise Stripe's status: "active", "trialing". */
  status: string;
  /** True when a paid plan was cancelled and runs out at the end of the period. */
  endsAtPeriodEnd: boolean;
}

/** The plan an account is on right now. No live subscription means the free plan. */
export async function currentPlan(env: Env, userId: string): Promise<CurrentPlan> {
  const table = schema.subscription;
  const [row] = await getDb(env)
    .select()
    .from(table)
    .where(and(eq(table.referenceId, userId), inArray(table.status, ACTIVE)))
    .orderBy(desc(table.periodEnd))
    .limit(1);
  if (!row) return { plan: freePlanId(env), status: "none", endsAtPeriodEnd: false };
  return { plan: row.plan, status: row.status ?? "active", endsAtPeriodEnd: Boolean(row.cancelAtPeriodEnd) };
}
