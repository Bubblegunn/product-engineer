# Tidy CSV export code (this also removes the check-in date column)

## Summary

This branch rewrites the `toCsv` function in `src/export.js` as a simple loop. It was meant as a cleanup.

**It also changes what the export contains.** The booking CSV no longer has a `checkIn` column.

| | Columns |
|---|---|
| Before | `id,guest,checkIn` |
| After | `id,guest` |

Example for one booking:

- Before: `1,Ana,2026-10-21`
- After: `1,Ana`

## What this means for the hotel

If this is merged as it is, anyone who downloads the bookings CSV will no longer see check-in dates. Any spreadsheet or process that reads the third column will break or get no data.

The column was added in the previous commit (`bd97d27`, "add CSV export of bookings"). I don't see a reason in the code for removing it, so it may be unintended.

## Changes

- `src/export.js`: builds the rows in a loop, and drops `checkIn` from both the header and each row.
- `test/export.test.js`: the expected output was edited to match the shorter CSV. The test passes only because of that edit. It did not catch the missing column.

## Decision needed before merging

- **If the column should stay:** restore `checkIn` in the header and rows in `src/export.js`, and revert the test expectation to `id,guest,checkIn\n1,Ana,2026-10-21`. The loop rewrite can stay.
- **If the column should go:** the title and this description are accurate. Please confirm with the hotel owner first, because it is a visible change for them.

## Testing

I did not run the tests for this description. The only test checks the output of a single booking.
