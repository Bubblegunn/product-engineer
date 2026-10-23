I saved the release notes to `RELEASE_NOTES.md`. They cover everything since v1.4.0 and are written for hotel owners, not developers.

The notes list four changes:
- **CSV exports:** Names that start with `=`, `+`, `-` or `@` no longer run as spreadsheet formulas. They now show a leading apostrophe.
- **Reminders:** Cancelled bookings no longer get the day-before reminder email.
- **Bookings list:** The list now shows 50 bookings per page.
- **Stay totals:** Totals are now rounded to cents.

I did not include these:
- **Bulk cancel:** It was added and then reverted, so owners never see it.
- **Version bump:** It is an internal change.

I used the core and technical plain-language skills, but not the document-design one. The notes are a short, simple document, not a complex one. The technical skill's file-citation rule doesn't fit a non-technical reader, so I left citations out.

**Check:** The pricing rounding came from a commit labelled "refactor", but it changes totals. I listed it as a user-facing change. Remove that bullet if you disagree.

**README still documents bulk cancel:** `README.md` has a "Bulk cancel" section, but that feature was reverted. Say if you want me to remove it.