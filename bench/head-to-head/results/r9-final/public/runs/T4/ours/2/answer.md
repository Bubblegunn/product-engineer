I wrote the release notes to `RELEASE_NOTES.md`. My earlier message said a check "passes", and that was the notes checker, not the project's tests. I've now run both after the last edit:

- **Notes checker:** `product-engineer notes RELEASE_NOTES.md --range v1.4.0` printed `notes: ok (0 warnings)`.
- **Project tests:** `npm test` (which runs `node --test`) printed `tests 5`, `pass 5`, `fail 0`, `cancelled 0`, `skipped 0`. The tests are unit tests only. I didn't launch the app, so I haven't watched any of these changes work in it.

The notes start with "Changes since v1.4.0" and cover four changes:
- **Bookings list:** it now shows 50 bookings at a time. I made no claim that it is faster, because nothing in the range measures that.
- **Reminders:** cancelled bookings no longer get a day-before reminder.
- **CSV export:** exported spreadsheet files can no longer run commands when opened, because entries that start like a formula are saved as plain text. The note gives no steps for abusing the old behaviour.
- **Stay totals:** nightly rate times nights is now rounded to two decimal places. This came from the pricing refactor commit, which also changed the rounding, so I wrote it as a customer-visible change.

The notes end with a "Not in this release" line saying the bulk cancel button was added and then withdrawn, so bookings are still cancelled one at a time.

I left out the version bump and the README change. The README edit documents bulk cancel, which isn't in this release, so you may want to remove that section from the README.