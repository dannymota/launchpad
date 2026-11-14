---
name: listing
description: Write the App Store and Google Play listings for the mobile app from the brief. Use when the owner asks for store listings, descriptions, keywords or screenshots ("/listing"), or before a launch check of a product with an app.
---

# /listing: the two store pages

Each store has its own fields and its own limits. Write each to its limit, not past it.

| Store | Field | Limit | File |
| --- | --- | --- | --- |
| App Store | name | 30 | `apps/mobile/store.config.json` (`title`; `npm run config:apply` sets it) |
| App Store | subtitle | 30 | same file |
| App Store | promotional text | 170 | same file (`promoText`) |
| App Store | description | 4000 | same file |
| App Store | keywords | 100 in all, commas included | same file |
| Google Play | title | 30 | `apps/mobile/store/android/listing/en-US/title.txt` |
| Google Play | short description | 80 | `.../short_description.txt` |
| Google Play | full description | 4000 | `.../full_description.txt` |

## Rules

- Read `product/brief.md` first. The first sentence of each description says what the app does and
  for whom; a person decides on that sentence.
- Keywords are words people type, not adjectives. Do not repeat the name or the subtitle in them.
- No claims the product cannot back: no "best", no rankings, no numbers that are not real.
- Support and privacy addresses point at the product's own domain (`/settings`, `/privacy`). With no
  domain yet, leave them and list "store URLs" under what waits for `/go-live`.
- Screenshots come from the Maestro flows in `apps/mobile/.maestro/`, which need a simulator or
  Expo's cloud runner. If neither is available, say so; do not mock screenshots.

## Gate

```bash
npm run check:listing
```
