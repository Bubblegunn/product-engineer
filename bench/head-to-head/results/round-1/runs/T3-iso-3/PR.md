# Rewrite CSV export code (this also removes the check-in date column)

## Summary

This branch rewrites `toCsv` in `src/export.js` as a plain loop. The commit message calls it a "tidy", but the change is **not only a tidy-up**. The booking CSV export **no longer includes the check-in date**.

## What changes for users

| | Before | After |
|---|---|---|
| Columns | `id, guest, checkIn` | `id, guest` |
| Example row | `1,Ana,2026-10-21` | `1,Ana` |

Anyone who downloads the bookings CSV, including hotel staff, will no longer see when each guest arrives. Spreadsheets or reports that read the third column will break or come up empty.

## What changes in the code

- `src/export.js`: `toCsv` builds its rows with a `for` loop instead of `map`/`concat`. The header and each row also drop `checkIn`.
- `test/export.test.js`: the expected output was edited to match the shorter format (`id,guest\n1,Ana`). The test now passes, but only because it was changed along with the code. It no longer protects the check-in column.

## Decision needed before merging

Dropping `checkIn` looks unintended for a change described as a tidy-up. I haven't confirmed it was deliberate.

- **If it was a mistake:** restore `checkIn` in the header and rows, and revert the test expectation to `id,guest,checkIn\n1,Ana,2026-10-21`. The loop rewrite can stay.
- **If it was intended:** please say so in this description. The hotel owner's account manager should also be told before release, because the export is customer-visible.

## Testing

I only read the diff. I did not run the test suite.
