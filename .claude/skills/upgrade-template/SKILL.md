---
name: upgrade-template
description: Bring a product that was copied from the Launchpad template up to a newer version of the template. Use when the owner asks to update, upgrade or sync with the template. Applies the entries in the template's docs/UPGRADING.md that are newer than this copy's TEMPLATE_VERSION, one at a time.
---

# Upgrading a copy of the template

A product is a copy, not a fork: there is nothing to merge. The template records each change a
copy may want as an entry in its `docs/UPGRADING.md`, newest first, with the version it arrived in.

## Steps

1. Read `TEMPLATE_VERSION` in this repository: the version this copy was made from, or last
   upgraded to.
2. Get the template's current `docs/UPGRADING.md` (the owner's `launchpad` repository). Take the
   entries with a version above `TEMPLATE_VERSION`, oldest first.
3. For each entry, in order:
   - read what it changes and why;
   - apply it by hand to this product. An entry about a part this product removed is skipped;
   - run `npm run check`;
   - commit it on its own, naming the entry.
4. Dependency bumps follow the entry's own steps (for Astryx:
   `npx astryx upgrade --from <old version> --apply`, run from `apps/web`).
5. Set `TEMPLATE_VERSION` to the last entry applied, and commit.

## Rules

- Never copy a file over the product's version of it. The product has diverged; apply the change.
- Never skip an entry marked **security**. If one cannot be applied cleanly, stop and tell the owner.
- A migration from the template is not copied: make the schema change, then `npm run db:generate`.
- Report which entries were applied, which were skipped and why, and the result of the final check.
