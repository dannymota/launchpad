// Who can reach what. Two separate controls, set per area of the product:
//
//   visibility  "public": anyone on the internet.  "internal": only people let through by
//               Cloudflare Access (enforced at the edge, and again by the Worker).
//   auth        "none": no sign-in.  "user": a signed-in person.  "admin": an admin.
//
// An internal area that needs a sign-in also says whose word it takes:
//   identity    "access": the Cloudflare Access email is the sign-in (no second login).
//               "session": a Better Auth session, on top of Access.
//
// A preset sets every area at once; `areas` in the product config overrides single areas.
// The Worker, the edge plan (edge.ts) and the generated test matrix all read this one map.

export type Visibility = "public" | "internal";
export type AuthLevel = "none" | "user" | "admin";
export type Identity = "access" | "session";
export type Preset = "private" | "internal-tool" | "private-beta" | "public-product";
export type SignupMode = "closed" | "allowlist" | "domain" | "open";

export interface Area {
  /** Path prefixes this area owns. "/" matches whatever no other area claims. */
  prefixes: readonly string[];
  visibility: Visibility;
  auth: AuthLevel;
  identity: Identity;
}

/** Every area of the product. Add one here to give a new part of the app its own setting. */
export const AREA_PATHS = {
  /** The public website: landing, pricing, legal. */
  site: ["/"],
  /** Sign-in. It is as visible as the product it leads to. */
  signIn: ["/sign-in"],
  /** The signed-in product. */
  product: ["/app"],
  /** Account pages and the assistant consent step: they need the person. */
  account: ["/settings", "/connect", "/authorize"],
  /** Internal in every preset. */
  admin: ["/admin"],
  labs: ["/labs"],
  /** The API. Each procedure checks its own sign-in; this decides who can reach it at all. */
  api: ["/rpc", "/api"],
  /** Procedures the public site calls (a waitlist form). As visible as the site. */
  publicApi: ["/rpc/public", "/api/public"],
  /** Procedures only admins call. Internal in every preset, like the admin pages. */
  adminApi: ["/rpc/admin", "/api/admin"],
  /** MCP and OAuth machine endpoints: called by assistants, protected by OAuth tokens. */
  mcp: ["/mcp", "/oauth", "/.well-known/oauth-"],
} as const satisfies Record<string, readonly string[]>;

export type AreaName = keyof typeof AREA_PATHS;
export const AREA_NAMES = Object.keys(AREA_PATHS) as AreaName[];
export type AccessMap = Record<AreaName, Area>;
export type AreaOverride = Partial<Pick<Area, "visibility" | "auth" | "identity">>;

export interface AccessConfig {
  preset: Preset;
  /** Changes to single areas, on top of the preset. */
  areas?: Partial<Record<AreaName, AreaOverride>>;
}

interface PresetShape {
  site: Visibility;
  product: Visibility;
  /** How a person is identified in the product while it is internal. */
  identity: Identity;
  signup: SignupMode;
}

export const PRESETS: Record<Preset, PresetShape> = {
  /** Before launch: everything behind Access, and the Access email is the sign-in. */
  private: { site: "internal", product: "internal", identity: "access", signup: "allowlist" },
  /** A tool for a team: stays behind Access for good. */
  "internal-tool": { site: "internal", product: "internal", identity: "access", signup: "closed" },
  /** A public website with the product still behind Access, for invited testers with real accounts. */
  "private-beta": { site: "public", product: "internal", identity: "session", signup: "allowlist" },
  /** Launched: public site and product. Only admin and labs stay internal. */
  "public-product": { site: "public", product: "public", identity: "session", signup: "open" },
};

const ALWAYS_INTERNAL: readonly AreaName[] = ["admin", "adminApi", "labs"];

function fromPreset(preset: Preset): Record<AreaName, Omit<Area, "prefixes">> {
  const shape = PRESETS[preset];
  // Access identity only means something behind Access.
  const identity: Identity = shape.product === "internal" ? shape.identity : "session";
  const product = { visibility: shape.product, identity };
  return {
    site: { visibility: shape.site, auth: "none", identity: "session" },
    signIn: { ...product, auth: "none" },
    product: { ...product, auth: "user" },
    account: { ...product, auth: "user" },
    admin: { visibility: "internal", auth: "admin", identity: "access" },
    labs: { visibility: "internal", auth: "none", identity: "access" },
    api: { ...product, auth: "none" },
    publicApi: { visibility: shape.site, auth: "none", identity: "session" },
    adminApi: { visibility: "internal", auth: "admin", identity: "access" },
    mcp: { ...product, auth: "none" },
  };
}

/** The full map for a config. Throws on a combination that would not be safe or would not work. */
export function resolveAccess(config: AccessConfig): AccessMap {
  if (!(config.preset in PRESETS)) throw new Error(`Unknown access preset "${config.preset}".`);
  const base = fromPreset(config.preset);
  const map = {} as AccessMap;
  for (const name of AREA_NAMES) {
    const override = config.areas?.[name] ?? {};
    const area: Area = { prefixes: AREA_PATHS[name], ...base[name], ...override };
    // Making an area public drops the Access identity with it, unless the config says otherwise (rejected below).
    if (area.visibility === "public" && override.identity === undefined) area.identity = "session";
    map[name] = area;
  }
  for (const name of AREA_NAMES) {
    const area = map[name];
    if (ALWAYS_INTERNAL.includes(name) && area.visibility !== "internal") {
      throw new Error(`The ${name} area is internal in every setup and cannot be made public.`);
    }
    if (area.visibility === "public" && area.identity === "access") {
      throw new Error(`The ${name} area is public, so it cannot take the Cloudflare Access email as a sign-in.`);
    }
    if (area.auth === "admin" && area.visibility !== "internal") {
      throw new Error(`The ${name} area is for admins, so it must be internal.`);
    }
  }
  if (map.account.identity !== map.product.identity || map.api.identity !== map.product.identity) {
    throw new Error("The product, account and api areas must identify people the same way.");
  }
  if (map.publicApi.visibility === "internal" && map.site.visibility === "public") {
    throw new Error("The public site needs the publicApi area to be public too.");
  }
  return map;
}

/**
 * The path as the access check sees it: decoded, lowercased, without the `.rsc` suffix
 * client navigations add. Null for a path that cannot be read safely; the caller refuses it.
 */
export function normalizePath(pathname: string): string | null {
  let path: string;
  try {
    path = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  if (!path.startsWith("/") || path.includes("\\") || path.includes("//")) return null;
  for (const char of path) if (char.charCodeAt(0) < 0x20 || char === "\u007f") return null;
  if (path.split("/").some((segment) => segment === ".." || segment === ".")) return null;
  path = path.toLowerCase();
  if (path.endsWith(".rsc")) path = path.slice(0, -4);
  if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
  return path || "/";
}

const owns = (prefix: string, path: string) =>
  // "/.well-known/oauth-" is a name prefix; every other entry is a path segment.
  prefix.endsWith("-") ? path.startsWith(prefix) : path === prefix || path.startsWith(`${prefix}/`);

/** The area a normalized path belongs to: the longest matching prefix, else the site. */
export function areaFor(map: AccessMap, path: string): { name: AreaName; area: Area } {
  let best: { name: AreaName; length: number } = { name: "site", length: 0 };
  for (const name of AREA_NAMES) {
    for (const prefix of map[name].prefixes) {
      if (prefix !== "/" && owns(prefix, path) && prefix.length > best.length) best = { name, length: prefix.length };
    }
  }
  return { name: best.name, area: map[best.name] };
}
