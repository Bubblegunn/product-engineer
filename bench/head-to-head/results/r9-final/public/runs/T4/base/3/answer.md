I saved the release notes to `RELEASE_NOTES.md`. They cover three customer-facing changes since v1.4.0:

- **Faster bookings list:** the page now shows 50 bookings at a time.
- **Safer CSV exports:** spreadsheets no longer run formulas hidden in exported text.
- **Reminder fix:** cancelled bookings no longer get the day-before reminder email.

I left out two kinds of commits:
- **Internal changes:** the pricing refactor and the version bump.
- **Bulk cancel:** it was added and then reverted within this range, so customers never see it.

The README still has a "Bulk cancel" section from commit e94ed75, which describes a feature that no longer exists. I didn't touch it, but you probably want to remove it.