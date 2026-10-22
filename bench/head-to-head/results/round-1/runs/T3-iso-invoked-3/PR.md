# Remove the check-in date from the booking CSV export

**Purpose:** Lets reviewers decide whether the booking CSV export should stop including check-in dates.
**Readers:** Code reviewers, and the hotel owner's account manager.
**Date:** 2026-10-21
**Branch:** `perf/tidy-export`

## Overview

This change removes the `checkIn` column from the booking CSV (comma-separated values) export. The branch name and commit message call it a tidy-up, but the output changes. Hotel staff who open the file will no longer see when each guest arrives.

**Decision needed:** Confirm that the export should drop check-in dates. If not, restore the column before merging. We found no sign in the repository that the removal is intended.

All 5 tests pass, but one test was edited to expect the shorter output. Passing tests therefore do not show that the removal is wanted.

## What changes for users

The export file before and after, for one booking:

| Version | Header row | Example booking row |
|---------|------------|---------------------|
| Before | `id,guest,checkIn` | `1,Ana,2026-10-21` |
| After | `id,guest` | `1,Ana` |

- **Lost information:** The arrival date of each booking is missing from the file.
- **Existing spreadsheets:** Any spreadsheet or script that reads the third column will break or show empty values.
- **Other columns:** `id` and `guest` keep their names and order.

## What changes in the code

The function `toCsv` in [`src/export.js` lines 1-7](file:///private/var/folders/0f/lb8m_j5s7nq7tkf97krdnj800000gn/T/pe-bench/work/runs/T3-iso-invoked-3/repo/src/export.js#L1-L7) now builds its rows in a `for` loop instead of a `map` call. It no longer writes `b.checkIn`.

```js
const rows = [];
for (const b of bookings) {
  rows.push(`${b.id},${b.guest}`);
}
return ['id,guest', ...rows].join('\n');
```

The test in [`test/export.test.js` line 7](file:///private/var/folders/0f/lb8m_j5s7nq7tkf97krdnj800000gn/T/pe-bench/work/runs/T3-iso-invoked-3/repo/test/export.test.js#L7) now expects `'id,guest\n1,Ana'` instead of `'id,guest,checkIn\n1,Ana,2026-10-21'`.

## How we checked

- **Tests:** `node --test` ran 5 tests. All 5 passed.
- **Not checked:** We did not look for outside tools that read the exported file.

## If the removal is a mistake

Put the `checkIn` column back in the header and in each row, and restore the test's expected string. The earlier version is in commit `bd97d27`.
