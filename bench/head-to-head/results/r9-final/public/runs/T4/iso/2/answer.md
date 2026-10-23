I saved the release notes in `RELEASE_NOTES.md` as version 1.4.1. They cover one improvement and two fixes:

- **Faster bookings list:** the page now shows 50 bookings at a time.
- **Reminder fix:** guests who cancelled no longer get the day-before reminder.
- **Safer CSV exports:** spreadsheets can no longer run formulas hidden in exported data.

I left out two kinds of change. The bulk cancel button was added and then reverted within the same release, so customers never see it. The `round2` pricing helper is an internal cleanup with no visible effect.

`README.md` still has a "Bulk cancel" section from the `docs: document bulk cancel` commit (e94ed75), even though the feature was reverted. You may want to remove it. I didn't touch it.

I haven't committed anything.