# Rewrite CSV export loop (also removes the check-in column)

## What changes for users

**The booking CSV export no longer includes the check-in date.** Before, each row had `id,guest,checkIn`. Now it has only `id,guest`.

Anyone who uses the export to see arrival dates will lose that information. Hotel owners and their account manager should know this before the change goes out.

| | Header | Example row |
|---|---|---|
| Before | `id,guest,checkIn` | `1,Ana,2026-10-21` |
| After | `id,guest` | `1,Ana` |

## What changes in the code

- `src/export.js`: `toCsv` now builds the rows in a `for` loop instead of `map` and `concat`. The output is the same apart from the dropped column.
- `test/export.test.js`: the expected CSV now matches the two-column output.

## Needs a decision before merge

The commit is titled "tidy export code", and the branch is named `perf/tidy-export`. Neither says that a column is being removed. I can't tell from the diff whether removing it is intended.

- If it is intended, please say why in this PR, and tell the owners that the export has changed.
- If it is not intended, restore `checkIn` in both the header and the rows, and in the test. The loop rewrite can stay.

The loop rewrite has no performance benefit that I can see. It is a style change.

## Testing

I only read the diff and have not run the tests. The one updated test checks the new two-column output. No test checks that the check-in date is still exported.
