// The product config, for scripts. product/product.config.ts is TypeScript and imports the
// shared package, so it is bundled in memory first (nothing is written to disk). Scripts get
// the same checked config, access map and edge plan the Worker uses.
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

export async function loadProduct(root = ROOT) {
  const shared = join(root, "packages/shared/src/product/index.ts");
  const result = await build({
    stdin: {
      contents: `export { default as product } from ${JSON.stringify(join(root, "product/product.config.ts"))};
export { edgePlan, areaFor, AREA_PATHS } from ${JSON.stringify(shared)};`,
      resolveDir: root,
      loader: "ts",
    },
    bundle: true,
    write: false,
    format: "esm",
    platform: "node",
    logLevel: "silent",
    alias: { "@app/shared/product": shared },
  });
  const source = Buffer.from(result.outputFiles[0].text).toString("base64");
  /** @type {{ product: any, edgePlan: (areas: any) => { path: string, action: "protect" | "bypass", area: string }[], areaFor: Function, AREA_PATHS: Record<string, string[]> }} */
  const loaded = await import(`data:text/javascript;base64,${source}`);
  return loaded;
}

/** The two places a product is deployed to, and what each is called there. */
export function targetOf(product, name) {
  if (name !== "staging" && name !== "production") {
    throw new Error(`Say where: "staging" or "production" (got ${name ? `"${name}"` : "nothing"}).`);
  }
  const staging = name === "staging";
  return {
    name,
    /** The wrangler environment: staging has one, production is the top level of wrangler.jsonc. */
    wranglerEnv: staging ? "staging" : undefined,
    worker: staging ? `${product.slug}-staging` : product.slug,
    database: staging ? `${product.slug}-staging-db` : `${product.slug}-db`,
    /** The product's own domain, once it has one. Staging always uses its workers.dev address. */
    domain: staging ? "" : product.domains.app,
  };
}
