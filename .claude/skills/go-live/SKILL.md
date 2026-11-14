---
name: go-live
description: Put the product on its own domain and open it to the public. Use only when the owner says to go live or launch and names the domain ("/go-live example.com"). Sets the domain and the access preset in the product config, updates Cloudflare Access, deploys to production and checks it from outside.
---

# /go-live: the domain, then the doors

This changes who can reach the product. Do it only on the owner's word in this conversation, and
confirm the two decisions before touching anything:

- **the domain** (it must already be a zone on the same Cloudflare account), and whether mail is
  sent from it or from another domain;
- **who gets in**: `public-product` (site and product open, sign-up open), `private-beta` (site
  open, product for invited people) or `internal-tool` (stays behind Access).

## Steps

1. `/launch-check` first. Do not go live over a failing gate unless the owner accepts it by name.
2. In `product/product.config.ts`: set `domains.app`, set `domains.email` if mail is ready, and
   change `access.preset`.
3. Carry it through, and commit:

```bash
npm run config:apply
```

```bash
npm run check
```

4. Update the edge, then deploy. Access goes first, so nothing internal is ever exposed:

```bash
npm run access:apply -- production --email owner@example.com
```

```bash
npm run deploy -- production --confirm <slug>
```

5. The deploy ends with the outside check on the domain. Read every line of it.

## What the owner must change elsewhere

Give these as a list with the exact values, since each lives in someone else's console:

- **Google sign-in**: authorised redirect `https://<domain>/api/auth/callback/google`.
- **Apple sign-in**: return URL `https://<domain>/api/auth/callback/apple`, and the domain itself.
- **Stripe**: webhook endpoint `https://<domain>/api/auth/stripe/webhook`.
- **Email**: the sending domain onboarded in Cloudflare Email Service.
- **The mobile app**: a new build, so its links and API address use the domain; then store review.
- **AI assistants**: the MCP address is `https://<domain>/mcp`.

Finish by saying what is live, at which address, for whom, and which items on that list are still open.
