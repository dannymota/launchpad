// Cloudflare, for scripts: the API with a token from the environment, and wrangler.
// The token is CLOUDFLARE_API_TOKEN. It is read here and passed on to wrangler through the
// environment; it is never printed, written to a file or put on a command line.
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { ROOT } from "./product.mjs";

const API = "https://api.cloudflare.com/client/v4";
export const WEB = join(ROOT, "apps/web");

export class CloudflareError extends Error {
  constructor(status, message) {
    super(message);
    this.name = "CloudflareError";
    this.status = status;
  }
}

export function tokenFrom(env = process.env) {
  const token = env.CLOUDFLARE_API_TOKEN?.trim();
  if (!token) {
    throw new Error(
      "CLOUDFLARE_API_TOKEN is not set. Create an API token in the Cloudflare dashboard (My Profile, API Tokens) with: Workers Scripts Edit, D1 Edit, Workers KV Storage Edit, Account Settings Read, Access: Apps and Policies Edit, and Access: Organizations, Identity Providers, and Groups Edit. Then set it in this shell, or in a cloud session ask for it through the credential form.",
    );
  }
  return token;
}

/** `cf("/accounts")` returns the result of a Cloudflare API call, or throws a CloudflareError. */
export function cloudflareApi(token, fetchImpl = globalThis.fetch) {
  return async function cf(path, { method = "GET", body } = {}) {
    const response = await fetchImpl(API + path, {
      method,
      headers: { authorization: `Bearer ${token}`, ...(body ? { "content-type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.success) {
      const reason = data?.errors?.map((error) => error.message).join("; ") || response.statusText;
      throw new CloudflareError(response.status, `Cloudflare ${method} ${path}: ${response.status} ${reason}`);
    }
    return data.result;
  };
}

/** The account to act on: CLOUDFLARE_ACCOUNT_ID, or the only account the token can see. */
export async function accountOf(cf, env = process.env) {
  if (env.CLOUDFLARE_ACCOUNT_ID?.trim()) return env.CLOUDFLARE_ACCOUNT_ID.trim();
  const accounts = await cf("/accounts");
  if (accounts.length === 1) return accounts[0].id;
  throw new Error(
    accounts.length === 0
      ? "This token can see no Cloudflare account. Give it Account Settings Read."
      : `This token can see ${accounts.length} accounts. Set CLOUDFLARE_ACCOUNT_ID to one of: ${accounts.map((account) => `${account.id} (${account.name})`).join(", ")}`,
  );
}

/** The host a Worker answers on: the product's domain when it has one, else its workers.dev address. */
export async function hostOf(cf, account, target) {
  if (target.domain) return target.domain;
  const { subdomain } = await cf(`/accounts/${account}/workers/subdomain`);
  return `${target.worker}.${subdomain}.workers.dev`;
}

/**
 * Runs wrangler in apps/web. `input` goes to its standard input (how secrets are passed).
 * Returns what it printed when `capture` is set; otherwise its output goes to the terminal.
 */
export function wrangler(args, { input, capture = false, account, env = {} } = {}) {
  return execFileSync("npx", ["wrangler", ...args], {
    cwd: WEB,
    input,
    encoding: "utf8",
    stdio: [input === undefined ? "ignore" : "pipe", capture ? "pipe" : "inherit", capture ? "pipe" : "inherit"],
    env: { ...process.env, CI: "1", ...(account ? { CLOUDFLARE_ACCOUNT_ID: account } : {}), ...env },
  });
}
