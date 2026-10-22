# Remove the check-in date from the bookings CSV export

## Summary

This change removes the `checkIn` column from the bookings export. The export now has two columns: `id` and `guest`. The commit message calls it a tidy-up, but it changes what the file contains.

## What changes for hotel owners

Exported CSV files no longer show the check-in date of each booking. Any spreadsheet, report or import that reads the third column will stop working or show empty data.

| | Before | After |
|---|---|---|
| Header | `id,guest,checkIn` | `id,guest` |
| Example row | `1,Ana,2026-10-21` | `1,Ana` |

Account managers: tell hotel owners who use the export that the check-in date is gone. If they need it, ask the team to restore the column before this merges.

## What changes in the code

- **Export function:** `toCsv` in [`src/export.js`](file:///src/export.js#L1-L8) now builds rows in a loop. It writes only `id` and `guest` for each booking.
- **Test:** the test in [`test/export.test.js`](file:///test/export.test.js#L5-L8) now expects `id,guest\n1,Ana`. The old expectation included `2026-10-21`, so the test was edited to match the new output rather than catching the change.

## Decision needed from the reviewer

Choose one of these before merging:

- **Dropping the column is intended.** Rename the commit and branch so they say so, and tell hotel owners.
- **Dropping the column is a mistake.** Restore `checkIn` in the header and in each row. Revert the test expectation to `id,guest,checkIn\n1,Ana,2026-10-21`.

## How to check

Run `node --test test/export.test.js`. The test passes with the current code, which only shows that the code matches the edited test.
