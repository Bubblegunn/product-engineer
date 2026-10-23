I saved the release notes to `RELEASE_NOTES.md`, covering everything since v1.4.0 (this release is 1.4.1). They have three items:

- **Improvement:** the bookings list is now paginated at 50 per page, so it loads faster.
- **Fix:** the day-before reminder no longer goes out for cancelled bookings.
- **Fix:** CSV exports are escaped so spreadsheets don't run booking text as formulas.

I left out the bulk cancel button. It was added and then reverted within this range, so customers never see it. The internal pricing refactor is also left out, since it doesn't change anything customers can see.

Commit `e94ed75` added bulk cancel to the README, and the revert didn't undo it. If the README still describes bulk cancel, it's now wrong, and you may want to remove that section.