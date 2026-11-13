// The product, in one file. Change a value here and every surface that depends on it
// follows: the Worker, sign-in, the access rules at the edge, emails, the mobile app.
// Email addresses and keys do not belong here; they are Worker variables and secrets.
import { defineProduct } from "@app/shared/product";

export default defineProduct({
  name: "Launchpad",
  slug: "launchpad",
  tagline: "A starting point with sign-in, an API and an assistant connection already working.",

  domains: {
    // Empty until launch: the workers.dev address stands in.
    app: "",
    // The domain mail is sent from. Empty = no mail, so no email-code sign-in on a deployed build.
    email: "",
  },

  // Who can reach what. Presets: "private" (everything behind Cloudflare Access, the default
  // before launch), "internal-tool", "private-beta", "public-product". Override one area with
  // areas: { mcp: { visibility: "public" } }. See packages/shared/src/product/access.ts.
  access: { preset: "private" },

  signIn: { emailCode: true, google: false, apple: false },
});
