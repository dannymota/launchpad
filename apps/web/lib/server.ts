// What server-rendered pages use to reach the backend: the Worker's bindings, the person
// the request is acting for, and the API called in-process. Never import this from a client component.

import { env as workerEnv } from "cloudflare:workers";
import { type Env, type Principal, requestPrincipal, type ServerApi, serverApi } from "@app/backend";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

export function getEnv(): Env {
  return workerEnv as unknown as Env;
}

/**
 * The person this page is being rendered for, looked up once per render. The Worker's
 * router decided how they are identified (a session, or the Cloudflare Access email) from
 * the area the page belongs to.
 */
export const pagePrincipal = cache(async (): Promise<Principal | null> => {
  return requestPrincipal(getEnv(), new Headers(await headers()));
});

/** The signed-in person, or a redirect to sign-in that returns to `next` afterwards. */
export async function requireUser(next: string): Promise<Principal> {
  const principal = await pagePrincipal();
  if (!principal) redirect(`/sign-in?next=${encodeURIComponent(next)}`);
  return principal;
}

/** The API, called in-process as the page's person. */
export function api(): ServerApi {
  return serverApi(getEnv(), pagePrincipal);
}
