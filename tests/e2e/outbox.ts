// Reads the local mail outbox of the Worker the browser tests run against (scripts/e2e-server.mjs).
import { execFileSync } from "node:child_process";
import path from "node:path";

const WEB = path.resolve(import.meta.dirname, "../../apps/web");

/** The newest sign-in code mailed to `email`. */
export function mailedCode(email: string): string {
  const out = execFileSync(
    "npx",
    [
      "wrangler",
      "d1",
      "execute",
      "DB",
      "--local",
      "--persist-to",
      ".wrangler/e2e",
      "--json",
      "--command",
      `select subject from email_outbox where recipient = '${email}' order by id desc limit 1`,
    ],
    { cwd: WEB, encoding: "utf8", env: { ...process.env, CI: "1" } },
  );
  const code = /\d{6}/.exec(out.slice(out.indexOf("[")))?.[0];
  if (!code) throw new Error(`No sign-in code was mailed to ${email}.`);
  return code;
}
