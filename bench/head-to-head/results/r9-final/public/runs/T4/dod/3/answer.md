I saved the release notes to `RELEASE_NOTES.md`. They cover three changes since v1.4.0:

- **Fix:** cancelled bookings no longer get the day-before reminder.
- **Fix:** CSV exports no longer let spreadsheets run guest names that start with `=`, `+`, `-` or `@` as formulas.
- **Improvement:** the bookings list is now paginated at 50 per page.

I left out the bulk cancel button. It was added and then reverted within the same range, so customers never see it. I also left out the internal pricing refactor and the version bump. I added a short "Good to know" line saying bulk cancel isn't part of this version. Delete it if you'd rather not mention it.

`README.md` still has a "Bulk cancel" section from the docs commit, even though the feature was reverted. I didn't touch it, since you only asked for release notes. I can remove that section if you want.

I only edited the notes file, so I didn't run the tests or `/dod:verify`.