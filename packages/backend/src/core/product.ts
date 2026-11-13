// The product config, as the backend reads it. The Worker's router puts the product on the
// request's env; anything called outside the router (a page) gets the repo's own config.
import defaultProduct from "@app/product";
import { defineProduct, PRESETS, type Preset, type Product } from "@app/shared/product";
import type { Env } from "../env";

const previews = new Map<string, Product>();

/** On a developer machine, DEV_PRESET tries another access preset without editing the config. */
function localPreview(env: Pick<Env, "APP_ENV" | "DEV_PRESET">): Product | null {
  const preset = env.DEV_PRESET;
  if (env.APP_ENV !== "local" || !preset || !Object.hasOwn(PRESETS, preset)) return null;
  let product = previews.get(preset);
  if (!product) {
    const { areas: _areas, signup: _signup, ...config } = defaultProduct;
    product = defineProduct({ ...config, access: { preset: preset as Preset } });
    previews.set(preset, product);
  }
  return product;
}

export function productOf(env: Pick<Env, "PRODUCT" | "APP_ENV" | "DEV_PRESET">): Product {
  return env.PRODUCT ?? localPreview(env) ?? defaultProduct;
}

export function withProduct<E extends Env>(env: E, product?: Product): E {
  return { ...env, PRODUCT: product ?? productOf(env) };
}

/** A comma-separated variable as a list of lowercase entries. */
export function listOf(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}
