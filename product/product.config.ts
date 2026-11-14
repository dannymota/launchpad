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

  // >>> payments
  // Plans. The free tier comes first. A paid plan is sold once its Stripe price id is set on
  // the Worker as STRIPE_PRICE_<ID IN CAPITALS> (here, STRIPE_PRICE_PRO).
  plans: [
    { id: "free", name: "Free", price: "Free", paid: false, includes: ["Everything you need to get started"] },
    {
      id: "pro",
      name: "Pro",
      price: "$12 a month",
      paid: true,
      includes: ["Everything in Free", "For people who use it every day"],
    },
  ],
  // <<< payments

  // >>> mobile
  // The iOS and Android app (apps/mobile). `npm run remove -- mobile` takes it out with the app.
  mobile: {
    bundleId: "com.example.launchpad",
    androidPackage: "com.example.launchpad",
    // Raise this when an old build can no longer work with the API; older builds are told to update.
    minVersion: "1.0.0",
  },
  // <<< mobile
});
