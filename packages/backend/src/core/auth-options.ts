// The parts of the Better Auth config that decide the database shape. Shared by the runtime
// instance (auth.ts) and the schema generator (auth.cli.ts) so the two can never disagree.
import type { BetterAuthOptions } from "better-auth";
import { emailOTP } from "better-auth/plugins";

export const CODE_LENGTH = 6;
export const CODE_SECONDS = 600;

/** Snake_case table and column names, as in every other table in this database. */
export const authTableOptions = {
  user: {
    modelName: "auth_user",
    fields: { emailVerified: "email_verified", createdAt: "created_at", updatedAt: "updated_at" },
  },
  session: {
    modelName: "auth_session",
    fields: {
      expiresAt: "expires_at",
      createdAt: "created_at",
      updatedAt: "updated_at",
      ipAddress: "ip_address",
      userAgent: "user_agent",
      userId: "user_id",
    },
  },
  account: {
    modelName: "auth_account",
    fields: {
      accountId: "account_id",
      providerId: "provider_id",
      userId: "user_id",
      accessToken: "access_token",
      refreshToken: "refresh_token",
      idToken: "id_token",
      accessTokenExpiresAt: "access_token_expires_at",
      refreshTokenExpiresAt: "refresh_token_expires_at",
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
  verification: {
    modelName: "auth_verification",
    fields: { expiresAt: "expires_at", createdAt: "created_at", updatedAt: "updated_at" },
  },
} satisfies Pick<BetterAuthOptions, "user" | "session" | "account" | "verification">;

export type SendCode = (input: { email: string; code: string; purpose: string }) => Promise<void>;

export function authPlugins(deps: { sendCode: SendCode }) {
  return [
    emailOTP({
      otpLength: CODE_LENGTH,
      expiresIn: CODE_SECONDS,
      // Codes are stored hashed, so a database read never reveals a usable code.
      storeOTP: "hashed",
      sendVerificationOTP: ({ email, otp, type }) => deps.sendCode({ email, code: otp, purpose: type }),
    }),
  ];
}
