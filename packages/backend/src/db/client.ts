import { drizzle } from "drizzle-orm/d1";
import type { Env } from "../env";
import * as schema from "./schema";

/**
 * The typed database. Build one per request: a D1 binding belongs to the request that
 * received it.
 *
 * D1 has no interactive transactions. Writes that must succeed or fail together go in one
 * `db.batch([...])`; `db.transaction()` throws on D1 and tests/boundaries.test.ts forbids it.
 */
export function getDb(env: Pick<Env, "DB">) {
  return drizzle(env.DB, { schema });
}

export type Db = ReturnType<typeof getDb>;
export { schema };
