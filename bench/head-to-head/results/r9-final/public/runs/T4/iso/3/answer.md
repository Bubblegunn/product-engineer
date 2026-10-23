I saved the release notes to `RELEASE_NOTES.md`. They cover three customer-visible changes since v1.4.0:

- **CSV export:** Text that looks like a formula is now treated as plain text, so it can't run when opened in a spreadsheet.
- **Day-before reminders:** They no longer go out for cancelled bookings.
- **Bookings list:** It now shows 50 bookings per page, so it loads faster.

I left out the version bump and the pricing refactor because customers wouldn't notice them. The bulk cancel button was added and then reverted within the same range, so it isn't in the notes either.

`README.md` still has a "Bulk cancel" section, even though the feature was reverted. The commit that added it (`e94ed75`) wasn't reverted along with it. You may want to remove that section so the docs match the product.