---
name: brand
description: Give the product its look from the brief. Use after /start, or when the owner asks to change the colours, typeface or corner radius of the whole product. Edits the one brand file, regenerates the web theme and the values the mobile app reads, and stops when the contrast tests pass.
---

# /brand: one look, everywhere

Everything visual on the web and in the app comes from `packages/theme/src/brand.ts`. You change
that file and one seed colour; everything else is generated.

## Steps

1. Read `product/brief.md`, mainly `## Voice` and `## Who it is for`. Choose:
   - **one accent colour**, from the product's world, not from habit. No purple-to-blue gradient,
     and not the template's blue unless the brief earns it;
   - **a neutral ramp** (graphite, warm or ink) that suits it;
   - **corner radii**: tight (6 / 8 / 10) for a tool people work in all day, softer for a consumer product;
   - **one typeface** that is free to ship. Keep the template's unless the brief asks for character.
2. Put the accent in `packages/theme/palette.config.json` as the seed, then regenerate the palette:

```bash
npm run palette -w @app/theme
```

3. Edit `packages/theme/src/brand.ts`: the colour pairs (each is `[light, dark]`), radii and font,
   and `character`: the look in a sentence or two, said as what it is. It opens `DESIGN.md`.
4. Rebuild. This also rewrites `DESIGN.md`, which the design skill and its detector hold pages to:

```bash
npm run theme
```

5. Replace the app icon, favicon and share image if the owner has supplied artwork. If not, leave
   the template's in place and list "icon artwork" under what the owner still owes. Do not draw a
   logo with shapes and call it done.

## Gate

Stage the brand and what it generated first (`git add packages/theme apps/web/src/themes DESIGN.md`):
the check rebuilds, and fails if rebuilding changes anything.

```bash
npm run theme:check
```

```bash
npm test
```

The theme tests hold every text colour to WCAG AA on every surface, in light and dark. If one
fails, change the colour in `brand.ts`, not the test. Then build, open the product in a browser in
both colour schemes, and look at sign-in, the app home and settings before reporting.
