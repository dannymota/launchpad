"use client";

// The browser's sign-in client. It talks to Better Auth at /api/auth on this origin.
// >>> payments
import { stripeClient } from "@better-auth/stripe/client";
// <<< payments
import { emailOTPClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  plugins: [
    emailOTPClient(),
    // >>> payments
    stripeClient({ subscription: true }),
    // <<< payments
  ],
});
