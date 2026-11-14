// Optional modules plug into the core here. A module registers itself (src/modules/index.ts);
// the core asks the registry what modules add, and never imports a module by name. That is
// what lets `npm run remove -- <module>` delete one without touching the core.
import type { BetterAuthPlugin } from "better-auth";
import type { Env } from "../env";

/** A sign-in route a module adds under /api/auth, with the per-client limit it is counted against. */
export interface ModuleAuthRoute {
  methods: readonly ("GET" | "POST")[];
  perIp: readonly ("sessionIp" | "socialIp")[];
}

export interface BackendModule {
  name: string;
  /** True when the module has the settings it needs. Until then it does nothing; /health says which. */
  on(env: Env): boolean;
  /** Better Auth plugins the module adds while it is on. */
  authPlugins?(env: Env): BetterAuthPlugin[];
  /** Routes under /api/auth the module's plugins serve. Reachable only while the module is on. */
  authRoutes?: Record<string, ModuleAuthRoute>;
}

const registry: BackendModule[] = [];

export function registerModule(module: BackendModule): void {
  if (!registry.some((existing) => existing.name === module.name)) registry.push(module);
}

export function modules(): readonly BackendModule[] {
  return registry;
}

/** Each registered module and whether it is on, for /health. */
export function moduleStates(env: Env): Record<string, "on" | "off"> {
  return Object.fromEntries(registry.map((module) => [module.name, module.on(env) ? "on" : "off"]));
}
