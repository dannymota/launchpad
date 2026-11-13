// The access map as Cloudflare Access sees it. Access matches a host and a path prefix, and
// the most specific match wins. So the map compiles to a short list of rules: a prefix gets
// one only where its visibility differs from the prefix that contains it.
//
//   everything internal   one rule protecting the whole host
//   site public           one rule per internal prefix
//
// A "bypass" rule is a public prefix inside a protected one (the public API under an
// internal API, or public MCP endpoints while the product is internal).
import { type AccessMap, AREA_NAMES, type AreaName, type Visibility } from "./access";

export interface EdgeRule {
  /** "" is the whole host. Otherwise a path prefix; one ending in "-" matches names that start with it. */
  path: string;
  action: "protect" | "bypass";
  area: AreaName;
}

interface Entry {
  path: string;
  visibility: Visibility;
  area: AreaName;
}

const contains = (parent: string, child: string) => parent === "" || child.startsWith(`${parent}/`);

export function edgePlan(map: AccessMap): EdgeRule[] {
  const root: Entry = { path: "", visibility: map.site.visibility, area: "site" };
  const entries: Entry[] = [root];
  for (const area of AREA_NAMES) {
    if (area === "site") continue;
    for (const path of map[area].prefixes) entries.push({ path, visibility: map[area].visibility, area });
  }

  const rules: EdgeRule[] = [];
  if (root.visibility === "internal") rules.push({ path: "", action: "protect", area: "site" });
  for (const entry of entries) {
    if (entry === root) continue;
    // The longest other prefix that contains this one; the whole host contains everything.
    const parent = entries
      .filter((other) => other !== entry && contains(other.path, entry.path))
      .sort((a, b) => b.path.length - a.path.length)[0];
    if (parent && parent.visibility !== entry.visibility) {
      rules.push({
        path: entry.path,
        action: entry.visibility === "internal" ? "protect" : "bypass",
        area: entry.area,
      });
    }
  }
  return rules.sort((a, b) => a.path.localeCompare(b.path));
}
