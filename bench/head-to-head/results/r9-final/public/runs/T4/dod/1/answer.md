I saved the release notes to `RELEASE_NOTES.md`, covering everything since v1.4.0 under the 1.4.1 version bump. I didn't run `/dod:verify` or the tests, since this only added a docs file.

They list three fixes (no reminders for cancelled bookings, formula-safe CSV exports, prices rounded to the cent) and one improvement (the bookings list loads 50 at a time).

- **Bulk cancel is left out.** It was added and then reverted within this range, so customers never received it.
- **The README still documents bulk cancel.** The commit that added that section wasn't reverted along with the feature. Its "Bulk cancel" section is still in `README.md`, and it describes something that doesn't exist. I didn't change it because you only asked for release notes. It should probably be removed.
- **The rounding fix started as a refactor.** The commit message called it a refactor ("extract round2 helper"), but it also changed `nightlyTotal` to round its result. I listed it as a fix on that basis.
- **The paging change has no page controls yet.** `listBookings` now returns only the first 50 bookings unless a page number is passed. If the bookings page has no next/previous controls, owners with more than 50 bookings won't see the rest. I worded the note as a speed improvement, so check that before you ship.