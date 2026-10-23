I saved the release notes to `RELEASE_NOTES.md`. They cover three changes since v1.4.0:

- **CSV export:** exports no longer let a spreadsheet run formulas.
- **Reminders:** the day-before reminder skips cancelled bookings.
- **Bookings list:** it now shows 50 bookings per page.

I left out the internal changes: the pricing refactor and the version bump. The bulk cancel button was added and then reverted, so I mentioned it only in a short note saying it isn't in this version.

The README still has a "Bulk cancel" section from commit `e94ed75`, and it is now out of date. I didn't change it because you only asked for the release notes. I can remove that section if you want.

I didn't run the DoD verification, because this was a docs-only change.