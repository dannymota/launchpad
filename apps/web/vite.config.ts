import { cloudflare } from "@cloudflare/vite-plugin";
import vinext from "vinext";
import { defineConfig } from "vite";

// The stylesheet must keep `light-dark()` as written. Astryx flips a region to its dark
// colours by setting `color-scheme: dark` on it, which only works while each token still
// holds both colours. With the default targets the CSS minifier rewrites `light-dark()`
// into variables resolved once at the page root. These are the first browser versions
// that support `light-dark()` themselves.
const CSS_TARGET = ["chrome123", "edge123", "firefox120", "safari17.5"];

export default defineConfig({
  build: { cssTarget: CSS_TARGET },
  plugins: [
    vinext(),
    // The Worker entry (worker/index.ts) runs in the RSC environment with SSR as a child,
    // so sign-in, the API, MCP and the pages share one Worker.
    cloudflare({ viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] } }),
  ],
});
