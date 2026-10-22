# Booking CSV export: tidy-up (drops the check-in date column)

**Analysis basis**

- Generated: 2026-10-21
- Branch: `perf/tidy-export` → `main` (1 commit, 2 files, +6 / −2)
- Method: read-only git inspection; tests were not run

## Summary

This branch was meant to be a code tidy-up of the booking CSV export. It also **changes what the export contains**: the `checkIn` column is removed.

## 💥 Change visible to users of the export

- Before: `id,guest,checkIn`, for example `1,Ana,2026-10-21`
- After: `id,guest`, for example `1,Ana`

Anyone who uses the exported file, including the hotel owner and their staff, will no longer see check-in dates. Spreadsheets, imports, or reports that expect three columns may break or show blanks.

**For the account manager:** if the owner relies on check-in dates in the export, this should not ship as it is.

## ♻️ Internals

- `toCsv` in `src/export.js` now builds rows with a loop instead of `map`/`concat`. This is a style change with no performance effect that I measured.
- `test/export.test.js` was updated to expect the two-column output. The test was changed to match the new behavior, so it no longer guards the check-in column.

## Needs a decision before merge

The commit message ("tidy export code") doesn't mention removing the column, so it may be unintentional. Pick one:

1. **Unintended:** restore `checkIn` in the header and rows, and revert the test change. The tidy-up can stay.
2. **Intended:** keep the removal, and say so in the commit message and release notes. Tell the hotel owner.

## Verification

Tests were not run for this description. The only evidence is the diff, including the updated assertion in `test/export.test.js`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
