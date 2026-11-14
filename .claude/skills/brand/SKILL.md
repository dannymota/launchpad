---
name: brand
description: Give the product its look from the brief. Use after /start, or when the owner asks to change the colours, typeface or corner radius of the whole product. Edits the one brand file, regenerates everything built from it, and stops when the contrast tests pass.
---

# /brand: one look, everywhere

Everything visual in the product comes from `packages/theme/src/brand.ts`. You change that file
and one seed colour; everything else is generated.

## Steps

1. Read `product/brief.md`, mainly `## Voice` and `## Who it is for`. Choose:
   - **one accent colour**, from the product's world, not from habit. No purple-to-blue gradient,
     and not the template's blue unless the brief earns it. The palette keeps the hue of the
     colour you give it and takes its strength from `vibrancy` (100 is vivid; 30 to 60 suits a
     quiet brand);
   - **four corner radii**, as inner / element / container / page: tight (6 / 8 / 10 / 16) for a
     tool people work in all day, softer (8 / 12 / 16 / 28) for a consumer product;
   - **one typeface** that is free to ship. Keep the template's unless the brief asks for character.

   The greys are not a choice here: they are the component library's neutral theme.
2. Put the accent in `packages/theme/palette.config.json` as the seed, and set `vibrancy`.
3. Edit `packages/theme/src/brand.ts`: the colour pairs (each is `[light, dark]`), radii and font,
   and `character`: the look in a sentence or two, said as what it is. It opens `DESIGN.md`.
   A new typeface is also loaded in `apps/web/src/themes/brand/brand.fonts.css` (the family, at
   weights 400, 500, 600 and 700): that file is yours to edit.
4. Rebuild. This regenerates the palette, the theme and `DESIGN.md`, which the design skill and
   its detector hold pages to:

```bash
npm run theme
```

5. Look at it. This takes pictures of sign-in, the app, settings and `/labs/brand` (a page that
   shows every colour, corner and text size the brand sets, on real components), in light and
   dark, at desktop and phone width, into `shots/`:

```bash
npm run build && npm run shots
```

   Open the pictures and judge them: the accent on a button and as link text, text on the quiet
   accent fill, the status colours beside your accent, both colour schemes. Fix what is wrong in
   `brand.ts`, never in a page.
6. `apps/web/app/icon.svg` is a placeholder. Replace it, and the share image, if the owner has
   supplied artwork. If not, leave it and add "icon artwork" to `## Open questions` in the brief.
   Do not draw a logo with shapes and call it done.

## Gate

Stage the brand and what it generated first (`git add packages/theme apps/web/src/themes DESIGN.md`):
the check rebuilds, and fails if rebuilding changes anything.

```bash
npm run theme:check
```

```bash
npm run check
```

The theme tests hold every text colour to WCAG AA on every surface, in light and dark. If one
fails, change the colour in `brand.ts`, not the test.
