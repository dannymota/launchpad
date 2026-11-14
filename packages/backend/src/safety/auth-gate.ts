// The sign-in routes this app uses, and nothing else. Better Auth mounts many endpoints;
// only the ones listed here are reachable, each behind its limits. An unlisted path under
// /api/auth answers 404, so a flow that was never wired cannot be reached by accident.
import { modules } from "../core/modules";
import { type SignInMethods, signInMethods } from "../core/runtime";
import type { Env } from "../env";
import { clientAddress, clientNetwork, consumeLimit, type LimitName } from "./limits";
import { passesTurnstile } from "./turnstile";

type Method = "GET" | "POST";
interface Route {
  methods: readonly Method[];
  /** Limits counted per client address. */
  perIp: readonly LimitName[];
  /** Limits counted per email address in the JSON body. */
  perEmail?: readonly LimitName[];
  /** Limits counted per client network. */
  perNetwork?: readonly LimitName[];
  /** The route exists only while one of these sign-in methods is on. */
  needs?: readonly (keyof SignInMethods)[];
  /** The route sends mail to an address the caller chose, so it is checked by Turnstile when that is on. */
  captcha?: boolean;
}

const ROUTES: Record<string, Route> = {
  "/get-session": { methods: ["GET"], perIp: ["sessionIp"] },
  "/sign-out": { methods: ["POST"], perIp: ["sessionIp"] },
  "/list-sessions": { methods: ["GET"], perIp: ["sessionIp"] },
  "/revoke-session": { methods: ["POST"], perIp: ["sessionIp"] },
  "/revoke-other-sessions": { methods: ["POST"], perIp: ["sessionIp"] },
  "/email-otp/send-verification-otp": {
    methods: ["POST"],
    perIp: ["codeIp"],
    perEmail: ["codeEmail"],
    perNetwork: ["codeNetworkDay"],
    needs: ["emailCode"],
    captcha: true,
  },
  "/sign-in/email-otp": { methods: ["POST"], perIp: ["signInIp"], perEmail: ["signInEmail"], needs: ["emailCode"] },
  "/sign-in/social": { methods: ["POST"], perIp: ["socialIp"], needs: ["google", "apple"] },
  "/callback/google": { methods: ["GET"], perIp: ["socialIp"], needs: ["google"] },
  // Apple answers with a cross-site form POST, which Better Auth turns into a GET.
  "/callback/apple": { methods: ["GET", "POST"], perIp: ["socialIp"], needs: ["apple"] },
  // The native app opens Google or Apple sign-in in the system browser through this.
  "/expo-authorization-proxy": { methods: ["GET"], perIp: ["socialIp"], needs: ["google", "apple"] },
  "/error": { methods: ["GET"], perIp: ["sessionIp"] },
};

/** A route one of the optional modules serves, while that module is on. */
function moduleRoute(env: Env, name: string): Route | undefined {
  for (const module of modules()) {
    if (module.authRoutes && Object.hasOwn(module.authRoutes, name) && module.on(env)) return module.authRoutes[name];
  }
  return undefined;
}

const notFound = () => Response.json({ code: "NOT_FOUND", message: "No such sign-in route." }, { status: 404 });

async function emailIn(request: Request): Promise<string | null> {
  try {
    const body = (await request.clone().json()) as { email?: unknown };
    return typeof body.email === "string" && body.email.length <= 320 ? body.email.trim().toLowerCase() : null;
  } catch {
    return null;
  }
}

/**
 * Null when the request may go on to Better Auth. Otherwise the answer to send: 404 for a
 * route that is not wired, 429 when a limit is reached.
 */
export async function authGate(request: Request, env: Env, basePath: string): Promise<Response | null> {
  const name = new URL(request.url).pathname.slice(basePath.length);
  // An own-key lookup: "constructor" and the like are not routes.
  const route: Route | undefined = Object.hasOwn(ROUTES, name) ? ROUTES[name] : moduleRoute(env, name);
  if (!route?.methods.includes(request.method as Method)) return notFound();
  if (route.needs) {
    const methods = signInMethods(env);
    if (!route.needs.some((method) => methods[method])) return notFound();
  }

  const checks: Promise<{ allowed: boolean; retryAfterSeconds: number }>[] = [];
  for (const name of route.perIp) checks.push(consumeLimit(env, name, clientAddress(request)));
  for (const name of route.perNetwork ?? []) checks.push(consumeLimit(env, name, clientNetwork(request)));
  if (route.perEmail) {
    const email = await emailIn(request);
    if (email) for (const name of route.perEmail) checks.push(consumeLimit(env, name, email));
  }
  const refused = (await Promise.all(checks)).find((result) => !result.allowed);
  if (!refused) {
    if (route.captcha && !(await passesTurnstile(request, env))) {
      return Response.json(
        { code: "CAPTCHA_FAILED", message: "We couldn't confirm you're a person. Reload the page and try again." },
        { status: 403, headers: { "cache-control": "no-store" } },
      );
    }
    return null;
  }
  return Response.json(
    { code: "RATE_LIMITED", message: "Too many attempts. Wait a few minutes, then try again." },
    { status: 429, headers: { "retry-after": String(refused.retryAfterSeconds), "cache-control": "no-store" } },
  );
}
