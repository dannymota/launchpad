# Sign-in and access

Two controls, kept separate: **Cloudflare Access** decides who can reach an internal area at all,
and **Better Auth** signs people in to the product. `docs/ARCHITECTURE.md` has the access map; this
file is how each control works and how to turn each sign-in method on.

## Before launch: Access is the sign-in

Under the `private` and `internal-tool` presets every area is internal and takes the Access email
as the person's identity. Someone allowed in by Cloudflare Access is signed in, with no second
login. The first request with a new email creates the account.

This is why a product with no domain yet can ship: there is no email to send and no redirect URL
to register. Admins are the Access-verified emails listed in `ADMIN_EMAILS`.

On a developer machine there is no Cloudflare Access, so `DEV_ACCESS_EMAIL` in
`apps/web/.dev.vars` stands in for it. It is honoured only when `APP_ENV` is `local`, and the
router refuses `local` and `test` on any host that is not loopback.

## After launch: the product's own sign-in

| Method       | Turned on by                                                                            | Notes                                                                                                                                             |
| ------------ | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Emailed code | `signIn.emailCode` and a sending domain (`domains.email`)                               | Six digits, ten minutes, stored hashed                                                                                                            |
| Google       | `signIn.google`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`                             | Redirect: `https://<domain>/api/auth/callback/google`                                                                                             |
| Apple        | `signIn.apple`, `APPLE_CLIENT_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY` | The client secret is signed from the key at run time, so nothing expires every six months. Return URL: `https://<domain>/api/auth/callback/apple` |

A method is offered only when both the config asks for it and its keys are present; `/health`
lists what is on. Google or Apple with the same verified email joins the existing account, so a
person who used a code on the web and Google on their phone has one account. To keep each method
as its own account, remove `accountLinking.enabled` in `packages/backend/src/accounts/auth.ts`.

## Who may create an account

`signup.mode` in the product config, defaulting from the preset:

- `open`: anyone;
- `allowlist`: the emails in `SIGNUP_ALLOWLIST`;
- `domain`: anyone at the email domains in `signup.domains`;
- `closed`: nobody new.

An address that may not sign up gets no email and the same answer as one that may, so the form
cannot be used to find out who has an account.

## What is reachable under `/api/auth`

Better Auth serves many routes. Only those in the table in
`packages/backend/src/safety/auth-gate.ts` exist; every other path under `/api/auth` is a 404.
Each allowed route names its limits. Admin endpoints are never listed: the admin page calls the
backend on the server.

## Limits

Counted in D1, so they hold across every Worker instance:

| Limit                 | Per              | Allows           |
| --------------------- | ---------------- | ---------------- |
| Sending a code        | email address    | 5 in 15 minutes  |
| Sending a code        | client address   | 20 in 15 minutes |
| Sending a code        | network, per day | 60               |
| Guessing a code       | email address    | 10 in 15 minutes |
| Mail to one recipient | day              | 10               |
| All mail              | day              | 500              |

The API also has an edge limit of 300 requests a minute per client.
The MCP endpoints share that limit.

Optional: Cloudflare Turnstile on the code form (`TURNSTILE_SITE_KEY` in `wrangler.jsonc`,
`TURNSTILE_SECRET_KEY` as a secret).
A native app cannot solve Turnstile, so with it on the mobile app offers Google and Apple only.

## Sessions

Thirty days, refreshed daily, with no cookie cache, so signing a device out takes effect at once.
Settings lists where a person is signed in and signs out any one of them. Deleting the account
needs a sign-in from the last ten minutes.

## Assistants (MCP)

An assistant connects with OAuth 2.1 and acts with the scopes the person approved on the consent page (`docs/MCP.md` has the flow).
Every call checks the assistant's connection against the database, so disconnecting it, banning the account or replaying an authorization code ends it at once.
A procedure marked `inPerson` refuses an assistant: deleting the account and managing sessions and connections stay with the person.

## Where to look when changing any of this

`.claude/rules/security-sensitive.md` loads when these files are touched. In short: a failing test
first, one place decides who a request is (`requestPrincipal`), refuse by default, and run
`/security-review` before saying it is done.
