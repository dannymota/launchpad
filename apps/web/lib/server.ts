// What server-rendered pages use to reach the backend: the Worker's bindings, the
// signed-in person, and the API called in-process. Never import this from a client component.

import { env as workerEnv } from "cloudflare:workers";
import { type Env, type Principal, type ServerApi, serverApi, sessionPrincipal } from "@app/backend";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { ORIGIN_HEADER } from "./request";

export function getEnv(): Env {
  return workerEnv as unknown as Env;
}

export const pageOrigin = cache(async (): Promise<string> => {
  const origin = (await headers()).get(ORIGIN_HEADER);
  if (!origin) throw new Error("Pages must be served through worker/index.ts, which sets the origin header.");
  return origin;
});

/** The signed-in person, looked up once per page render. */
export const pagePrincipal = cache(async (): Promise<Principal | null> => {
  return sessionPrincipal(getEnv(), await pageOrigin(), new Headers(await headers()));
});

/** The signed-in person, or a redirect to sign-in that returns to `next` afterwards. */
export async function requireUser(next: string): Promise<Principal> {
  const principal = await pagePrincipal();
  if (!principal) redirect(`/sign-in?next=${encodeURIComponent(next)}`);
  return principal;
}

/** The API, called in-process as the page's signed-in person. */
export function api(): ServerApi {
  return serverApi(getEnv(), pagePrincipal);
}
