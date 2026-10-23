I saved the release notes to `RELEASE_NOTES.md`. They cover everything since v1.4.0, written for hotel owners. I haven't committed the file.

The notes list two fixes and two improvements:
- **Reminders:** Cancelled bookings no longer get the day-before email.
- **CSV export:** Values starting with `=`, `+`, `-` or `@` get an apostrophe in front, so spreadsheets don't run them as formulas. The notes warn owners that names starting with those characters will show the apostrophe.
- **Bookings list:** It shows 50 bookings per page.
- **Stay totals:** They are rounded to two decimal places.

The notes also say bulk cancel is not in this release, because it was added and then reverted.

I've since seen two problems:
- **README is out of date:** It still has a "Bulk cancel" section, added in `e94ed75`. The revert `f37976b` didn't remove it, so the README describes a feature that doesn't exist. I left it alone, but you should probably delete it.
- **Pagination wording:** The diff shows `listBookings` accepting a page number, but I couldn't see any page controls in the interface. I wrote only that the list shows 50 at a time. Please check the wording against what owners actually see.

I applied the ISO 24495-1 and 24495-5 skills. I didn't use 24495-2 because there's no legal text, or 24495-3 because the notes are for owners rather than technical readers.