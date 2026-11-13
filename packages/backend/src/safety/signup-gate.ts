// Who may create an account. Signing in to an existing account is never affected.
import type { SignupMode } from "@app/shared/product";
import { listOf, productOf } from "../core/product";
import type { Env } from "../env";

export function signUpAllowed(
  mode: SignupMode,
  email: string,
  lists: { allowlist: string[]; domains: string[] },
): boolean {
  const address = email.trim().toLowerCase();
  const domain = address.slice(address.lastIndexOf("@") + 1);
  if (!address.includes("@") || !domain) return false;
  switch (mode) {
    case "open":
      return true;
    case "closed":
      return false;
    case "allowlist":
      return lists.allowlist.includes(address);
    case "domain":
      return lists.domains.includes(domain);
  }
}

/** The gate for this product: its mode and domains from the config, its allowlist from SIGNUP_ALLOWLIST. */
export function signUpAdmitted(env: Env, email: string): boolean {
  const { mode, domains } = productOf(env).signup;
  return signUpAllowed(mode, email, { allowlist: listOf(env.SIGNUP_ALLOWLIST), domains });
}
