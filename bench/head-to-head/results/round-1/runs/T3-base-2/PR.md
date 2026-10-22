# Tidy booking CSV export (removes the check-in column)

## Summary

This PR rewrites `toCsv` in `src/export.js` as a plain loop. **It also changes what the export contains: the `checkIn` column is no longer exported.**

## What changes for users

The booking CSV export used to have three columns:

```
id,guest,checkIn
1,Ana,2026-10-21
```

After this PR it has two:

```
id,guest
1,Ana
```

Anyone who uses the export to see arrival dates (for example hotel staff or the owner's account manager) will no longer get them. Spreadsheets or scripts that expect three columns will also be affected.

## Code changes

- `src/export.js`: `toCsv` builds the rows in a `for` loop instead of `map`/`concat`. The header and row template now contain only `id` and `guest`.
- `test/export.test.js`: the expected output is updated to the two-column format.

## Open question for reviewers

The commit message is "tidy export code", which suggests a refactor with no change in behavior. Dropping `checkIn` looks like a side effect rather than a deliberate decision. Before merging, please confirm one of the following:

- **Unintended:** restore `checkIn` in the header and row, and revert the test change. The loop refactor can stay.
- **Intended:** this description stands. The change should then be announced to the hotel owner, since it removes data they currently receive.

## Testing

- The updated unit test in `test/export.test.js` covers the new two-column output. I did not run it for this description.
- The test was changed to match the new output, so it does not guard against losing `checkIn`.
