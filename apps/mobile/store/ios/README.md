# App Store

- `../../store.config.json` is the listing (EAS Metadata). `/listing` fills it from the brief and
  keeps every field inside Apple's limits: title 30, subtitle 30, keywords 100 characters in total,
  promotional text 170, description 4000.
- `screenshots/` holds the screenshots, taken by the Maestro flows (`takeScreenshot`). Apple needs
  the 6.9-inch iPhone size; add the 13-inch iPad size if the app supports iPad.
- `review-notes.md` is what App Review reads: how to sign in (a demo account, or that sign-in is
  by emailed code) and anything that is not obvious.

Sign in with Apple must be offered whenever Google sign-in is. Turn both on together in
`product/product.config.ts`.
