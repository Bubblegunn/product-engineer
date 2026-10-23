I saved the release notes to `RELEASE_NOTES.md`. They cover three changes since v1.4.0:

- **Safer CSV exports:** exported files can no longer contain content that a spreadsheet might run as a formula.
- **Reminders:** the day-before reminder now skips cancelled bookings.
- **Faster bookings list:** the page now shows 50 bookings at a time.

I left out the bulk cancel button, because it was added and then reverted, so customers never see it. I also left out the internal pricing refactor and the version bump.

The README still has a "Bulk cancel" section, left over from `e94ed75`, even though the feature was reverted. You may want to remove it. I didn't touch it.