# Tidy booking CSV export (also drops the check-in column)

## Summary

This branch rewrites `toCsv` in `src/export.js` as a plain loop. **It also changes what the export contains: the `checkIn` column is no longer exported.** The commit is titled "tidy export code", but it is not a pure refactor.

## What changes for users

The CSV export of bookings, added in `bd97d27`, used to look like this:

```
id,guest,checkIn
1,Ana,2026-10-21
```

With this branch it looks like this:

```
id,guest
1,Ana
```

Anyone who relies on check-in dates in the exported file, such as the hotel owner or their account manager, will no longer get them. Spreadsheets or scripts that expect three columns will also break.

## Code changes

- `src/export.js`: builds the rows in a `for` loop instead of `map`/`concat`. The header and row template now contain only `id` and `guest`.
- `test/export.test.js`: the expected output is updated to the two-column format.

## Decision needed before merge

I couldn't tell from the diff whether removing `checkIn` was intended. The test was edited to match the new output, so it doesn't catch the change.

- **If the column should stay:** restore `checkIn` in the header and the row template, and revert the test expectation. The loop rewrite can stay as it is.
- **If removal is intended:** please say why in this description, and tell the account manager so the owner isn't surprised.

## Testing

I haven't run the tests for this description. The only test checks the header and a single row, and it was changed along with the code.
