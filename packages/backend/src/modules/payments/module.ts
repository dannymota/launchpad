// Payments: subscriptions through Stripe, by way of Better Auth's Stripe plugin. Checkout
// and the customer portal are Stripe's own pages; the plugin keeps a `subscription` row in
// step with Stripe through signed webhooks.
// Web only: the app stores have their own rules for what a mobile app may sell.
//
// On when STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET are both set. Until then its routes
// do not exist and everyone is on the free plan.
import { stripe } from "@better-auth/stripe";
import Stripe from "stripe";
import type { BackendModule } from "../../core/modules";
import type { Env } from "../../env";
import { stripePlans } from "./plans";

const on = (env: Env) => Boolean(env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET);

export const payments: BackendModule = {
  name: "payments",
  on,
  authPlugins(env) {
    if (!on(env)) return [];
    return [
      stripe({
        // Workers have fetch, not Node's http.
        stripeClient: new Stripe(env.STRIPE_SECRET_KEY as string, { httpClient: Stripe.createFetchHttpClient() }),
        stripeWebhookSecret: env.STRIPE_WEBHOOK_SECRET as string,
        // A Stripe customer is made when someone first heads to checkout, not for every sign-up.
        createCustomerOnSignUp: false,
        subscription: { enabled: true, plans: () => stripePlans(env) },
      }),
    ];
  },
  authRoutes: {
    "/subscription/upgrade": { methods: ["POST"], perIp: ["sessionIp"] },
    "/subscription/cancel": { methods: ["POST"], perIp: ["sessionIp"] },
    "/subscription/restore": { methods: ["POST"], perIp: ["sessionIp"] },
    "/subscription/billing-portal": { methods: ["POST"], perIp: ["sessionIp"] },
    "/subscription/list": { methods: ["GET"], perIp: ["sessionIp"] },
    "/subscription/success": { methods: ["GET"], perIp: ["sessionIp"] },
    // Stripe's servers call this. It is trusted by its signature, checked by the plugin.
    "/stripe/webhook": { methods: ["POST"], perIp: ["socialIp"] },
  },
};
