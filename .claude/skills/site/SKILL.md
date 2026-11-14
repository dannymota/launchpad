---
name: site
description: Write the product's public website from the brief. Use when the owner asks for the landing page, pricing, FAQ or legal pages ("/site"), or before a launch check. Builds pages under apps/web/app/(site) from Astryx templates, in the brief's voice, with page metadata, a sitemap and robots rules.
---

# /site: the public website

The site is everything under `apps/web/app/(site)/`. It is public once the product launches, and
behind Cloudflare Access with the rest until then.

## Pages

| Page | Path | Says |
| --- | --- | --- |
| Landing | `/` | What it is, who it is for, the main thing it does, one call to action |
| Pricing | `/pricing` | The plans from `product.config.ts`. Leave the page out when there are no paid plans |
| FAQ | `/faq` | The five questions a newcomer has, answered in two sentences each |
| Privacy | `/privacy` | What is collected, why, where it is kept, how to delete an account |
| Terms | `/terms` | The entity, the jurisdiction and the contact from the brief |

## Rules

- **Start each page from a template**: `npx astryx build "<what the page is for>"`, run from
  `apps/web`. Keep the frame; replace every word and number with the product's.
- **Take facts from the config, not from memory**: name and tagline from `productOf(getEnv())`,
  plans from `product.plans`, the support address as `support@` the sending domain.
- **Write in the brief's voice.** No greeting headline, no exclamation marks, no invented
  customers, numbers, logos or testimonials. A claim is a fact about the product or it goes.
- **Privacy and terms describe this product as built**: emailed sign-in codes, a session cookie,
  the analytics cookie only if the analytics module is present, payments by Stripe only if payments
  are. They are drafts: say so at the top of your report, since a person must read them before launch.
- **Metadata**: each page exports `metadata` with a title and description. Add `sitemap.ts` and
  `robots.ts` at the app root, listing only `(site)` pages. The Worker already keeps everything
  else out of search engines.

## Gate

```bash
npm run build
```

```bash
npm run doctor -w @app/web
```

Run the `unslop-ui` skill on the landing page at 1440 and 390 wide, fix what it grades above "no
slop", and open every link on every page once. Then `npm run check`.
