# style: format the code (includes one pricing change)

## Summary

This PR reformats the code: line wrapping, quote style, trailing commas and a few one-liners expanded to multi-line. It also contains **one change to how prices are calculated**. The commit message says "no functional change", and that is not accurate for `src/pricing.js`.

## For the hotel owner / account manager: what could affect guests or billing

**`nightlyTotal` now rounds down to the cent.**

- Before: `rate * nights`, unrounded.
- After: `Math.floor(rate * nights * 100) / 100`.
- Because of floating-point error, this can come out one cent lower than the true total. Example: a rate of 4.35 for 1 night now returns **4.34**. Before, it returned 4.35. Other examples: 1.15 returns 1.14 and 2.675 returns 2.67.
- Nothing else in `src/` calls `nightlyTotal` today, so no booking, email or CSV output currently changes. Any future use would be affected.
- There is no test for this function.
- **Decision needed:** either drop this line from the PR (the safest option for a formatting PR), or keep it deliberately. If kept, use `Math.round` instead of `Math.floor`, and add a test.

Everything else is formatting only. The reminder email text, the CSV export columns and the reminder timing are unchanged.

## Changes

| File | Change |
|---|---|
| `README.md` | Tagline split over two lines (same wording). |
| `src/export.js` | `toCsv` wrapped over several lines and double quotes used. Output is identical. |
| `src/list.js` | `listBookings` expanded to a multi-line body. |
| `src/mail.js` | `reminderBody` is built from an array joined with `\n`. The text is identical. Export list expanded. |
| `src/pricing.js` | **Behavior change, see above.** |
| `test/reminders.test.js` | Reformatted only. Same two tests, same assertions. |

## Verification

Checks run on this branch (DoD-Guard `/dod:verify`):

- Stub and empty-function scan: 0 issues (8 files).
- `npm test`: 5 passed, 0 failed, 0 skipped (exit code 0).
- Manual check of the export: `toCsv([{id:1,guest:'A',checkIn:'2026-10-21'}])` returns `id,guest,checkIn\n1,A,2026-10-21`.
- Manual check of the pricing change: `nightlyTotal(4.35, 1)` returns `4.34` (previously `4.35`).

The existing tests do not cover `pricing.js`, so a green test run does not show the pricing change is safe.
