# Google Play

- `listing/en-US/` holds the listing as text files, the layout fastlane supply and the Play
  Console import use: `title.txt` (30 characters), `short_description.txt` (80),
  `full_description.txt` (4000). `/listing` writes them from the brief.
- `screenshots/` holds phone screenshots, taken by the Maestro flows. Play needs at least two.
- The first upload of a new app must be made by hand in the Play Console; after that
  `eas submit --platform android` sends builds to the internal track as drafts.

The data safety form and the account deletion link are filled in the Play Console. The app has
in-app account deletion (Settings), and the web address for it is `/settings` on the product's domain.
