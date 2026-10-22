# Tidy booking CSV export (removes the check-in column)

## Summary

This branch rewrites `toCsv` in `src/export.js` as a plain loop. **It also changes what the export contains: the `checkIn` column is no longer written.** The commit message ("tidy export code") describes it as a refactor, but the output is different.

## What changes for users

| | Before | After |
|---|---|---|
| Header | `id,guest,checkIn` | `id,guest` |
| Row | `1,Ana,2026-10-21` | `1,Ana` |

Anyone who downloads the bookings CSV will no longer see check-in dates. Spreadsheets, imports or reports that expect three columns, or that read the check-in date, will break or lose that data. The hotel owner's account manager may want to tell the owner before this goes out.

## Code and test changes

- `src/export.js`: the `map`/`concat` expression becomes a `for` loop that builds `rows`. The loop only emits `id` and `guest`.
- `test/export.test.js`: the expected output was edited to `id,guest\n1,Ana`. The test passes because it was changed to match the new output. It doesn't show that the behavior is unchanged.

## Decision needed before merging

Was dropping `checkIn` intended?

- **If not (likely, given this is meant as a tidy-up):** restore `checkIn` in the loop and in the header, and revert the test change. Then this is a pure refactor.
- **If so:** the title and commit message should say that, and the owner should be told. The CSV export was added in `bd97d27` and has presumably shipped or is about to.

## Not covered

- I haven't run the test suite for this description.
- Nothing changes for guests or other features. Only the CSV export output is affected.
- The branch name says `perf`, but the diff has no measurable performance change.
