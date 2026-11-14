---
name: start
description: Turn an idea into this product's brief and config. Use when the owner gives an idea for a new product in a fresh copy of the template ("/start a tool that ..."), or asks to redo the brief. Writes product/brief.md and product/product.config.ts, removes the surfaces and modules the idea does not need, and stops at a passing check.
---

# /start: from an idea to a brief

The owner gives one or two sentences. You produce a brief the rest of the pipeline builds from.
Ask little: infer what you can, ask only what you cannot, and confirm once.

## 1. Work out the product

From the idea, decide each line below yourself. Mark the ones you are unsure of.

- **Name**, a slug (lowercase, dashes) and a one-line tagline.
- **Who it is for** and **the main thing they do** with it. That one job becomes the first feature.
- **What it is not**: two or three things it will not do, so later work stays small.
- **Which optional parts it has**, of those still in this copy. `npm run remove` lists them.
  - `site`: a public website.
  - `mobile`: a mobile app, for iOS and Android.
  - `mcp`: an MCP server, so assistants can use the product for a person.
  - `payments`: a paid plan.
  - `ai`: model calls, under a budget.
  - `analytics`: page views and events.
- **Access before launch**: `private` (everything behind Cloudflare Access) unless told otherwise.
  After launch: `public-product`, `private-beta` or `internal-tool`.
- **What the template does not do.** Read "What is deliberately not here" in
  `docs/ARCHITECTURE.md` (shared team accounts, file uploads, push notifications and more). If the
  idea needs one of them, do not assume it: put it under `## Open questions` as work to plan. Mail
  is not sent until the product has a sending domain.
- **Sign-in after launch**: emailed code always; Google and Apple when the people it is for expect them.
  A product with a mobile app offers both.

## 2. Ask once

Ask the owner, in one message, only for what you could not infer, and always for these, since
nothing in the idea can tell you:

- the legal entity, a contact email and the jurisdiction (for the brief's `## Legal`);
- whether there is a domain yet (it is fine if not: the product ships on workers.dev first);
- anything you marked unsure.

Then show the whole brief as a short summary and ask "go?". One confirmation, not one per line.

## 3. Write it down

In this order. Each step leaves the checks passing for the next.

1. `product/brief.md` with these sections, each filled in: `# <Name>`, then:
   - `## What it is`, `## Who it is for`, `## The main thing people do`: a short paragraph each.
   - `## What it is not`: a short list, one thing a line.
   - `## Surfaces`: the optional parts it has and the ones it does not, surfaces and modules alike.
   - `## Access`, `## Plans` (name every plan in the config), `## Legal`.
   - `## Voice`: one paragraph, no list: three plain words for the voice, then two example
     sentences written in it.
   - `## Open questions`: what the owner still has to decide or supply, and every decision you
     made without them, so they can overrule it.
   - If the owner gave real proof (customers, numbers, a quote), add `## Proof` with exactly that.
     Never invent any.
2. `product/product.config.ts`: name, slug, tagline, access preset and sign-in methods. Leave
   `domains` empty unless the owner has them.
   - `plans`: what people can be on, the free tier first.
   - `mobile`: the bundle id, `com.<entity>.<slug>`.
3. `npm run config:apply`, so the Worker, the database and everything else that repeats the name
   or the plans carry the new ones.
4. Remove each optional part the product does not have, one at a time: `npm run remove -- <name>`.
   Each removal is permanent, so each asks the owner first; do it only for a clear "no" in the
   brief. A removal also brings the documents, the local database and the design files up to date.
5. `README.md` and `AGENTS.md` still describe the template. Rewrite `README.md` as the product's:
   its name, its tagline, a few lines on what it is from the brief, then how to run and check it
   (keep those two sections). In `AGENTS.md` change the title and the first paragraph only, to say
   what this product is and that it was made from the Launchpad template.
6. `npm run design:context`, which writes what the design skill reads about the product
   (`PRODUCT.md`) from the brief. The skill reads it before it touches a screen. Do not write it
   by hand or run `/impeccable init`.

## 4. Gate

```bash
npm run check:brief
```

```bash
npm run check
```

Both must pass; run them here, once, not after each step above. Then tell the owner what the
brief says in five lines, which parts were removed, what you decided without them, and that
`/brand` is next. Do not start building features in this step.
