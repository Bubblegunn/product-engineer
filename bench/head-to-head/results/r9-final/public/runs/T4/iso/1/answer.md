I saved the release notes to `RELEASE_NOTES.md`. They cover three changes since v1.4.0, all written for hotel owners:

- **Fix:** guests who cancelled no longer get the day-before reminder.
- **Fix:** CSV exports no longer let spreadsheets run booking details as formulas.
- **Improvement:** the bookings list now shows 50 bookings per page, so it loads faster.

I left some changes out because they don't affect customers:

- **Bulk cancel:** the button was added and then reverted, so customers never see it.
- **Pricing change:** a pricing refactor.
- **Version bump:** the bump to 1.4.1.

The README commit `e94ed75` still documents the bulk cancel button, which no longer exists. You may want to remove that section.