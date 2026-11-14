---
paths:
  - "packages/backend/src/core/**"
  - "packages/backend/src/safety/**"
  - "packages/backend/src/accounts/**"
  - "packages/shared/src/product/**"
  - "apps/web/worker/**"
  - "apps/mcp/oauth/**"
---

# Sign-in, access and the Worker's router

A mistake here exposes accounts or internal pages. Work to a higher bar:

- **A test first, and it must fail first.** Every change comes with a Workers-runtime test in
  `apps/web/tests/` that fails without the change. For a rule that refuses something, break the
  rule on purpose once and see the test catch it.
- **One place decides.** Who a request is comes from `requestPrincipal()`; which area a path
  belongs to, from the access map. Do not read cookies, the Access header or `x-app-*` headers
  anywhere else, and do not add a second check that can drift from the first.
- **Refuse by default.** An unknown path, method, origin or sign-in route is a 404 or a 403, never a
  fall-through. A new sign-in route goes in the route table (`safety/auth-gate.ts`) with its limits.
- **Nothing local reaches production.** `DEV_ACCESS_EMAIL`, `DEV_PRESET`, `ACCESS_TEST_JWKS` and the
  mail outbox work only when `APP_ENV` is `local` or `test`, and the router refuses those modes on a
  public host. Keep it that way.
- **No secrets in code, logs, errors or tests.** Log an event name and a status, never a token, a
  code, an email body or a request body.
- **When you are done**, run `/security-review` on the change and fix what it finds before saying
  the work is finished.
