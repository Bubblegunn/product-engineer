# Tidy booking CSV export (removes the check-in column)

## Summary

This rewrites `toCsv` in `src/export.js` as a plain loop. The rewrite also **changes what the export contains**: the `checkIn` column is no longer written.

## What changes for users

The bookings CSV export previously looked like this:

```
id,guest,checkIn
1,Ana,2026-10-21
```

After this PR it looks like this:

```
id,guest
1,Ana
```

Anyone who downloads the export, including the hotel owner and their account manager, will no longer see check-in dates. Spreadsheets or reports that read the third column will break or come up empty.

## Is the removal intended?

The commit message ("tidy export code") doesn't mention it, and the branch name (`perf/tidy-export`) suggests a refactor with no behaviour change. It looks like the column was dropped by accident. I haven't confirmed that with the author.

**Before merging, decide one of these:**
- If the column should stay, restore `checkIn` in the header and rows in `src/export.js`, and revert the expected string in `test/export.test.js`.
- If removing it is intended, merge as is and tell the hotel owner that check-in dates are no longer in the export.

## Code changes

- `src/export.js`: builds the rows in a `for…of` loop instead of `concat` + `map`. The loop writes only `id` and `guest`.
- `test/export.test.js`: the expected output changed to `id,guest\n1,Ana`. The test was edited to match the new output, so it no longer protects the check-in column.

## Testing

I didn't run the tests for this description. The existing test passes only because its expectation was changed to the new two-column output.
