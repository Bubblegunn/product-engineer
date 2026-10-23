# style: format the code (includes one pricing change)

## Summary

This branch reformats the code: quote style, line wrapping and trailing commas. Almost all of it changes layout only. **One change is not formatting and affects the amount a guest is charged** (see "Pricing change" below).

## For the hotel owner and account manager

- **Guest emails:** the wording is unchanged. Reminder subject and body read exactly as before. Only the code that builds the text was rearranged.
- **CSV export of bookings:** unchanged. The columns and the data are the same.
- **Booking list and reminders:** unchanged.
- **Stay totals:** this is the one change that can differ. See below.

## Pricing change

`src/pricing.js`, `nightlyTotal(rate, nights)`:

- Before: `rate * nights`
- After: `Math.floor(rate * nights * 100) / 100`

The new code cuts the total off at two decimal places and always rounds **down**. It does not round to the nearest cent. Checked by running it:

| rate × nights | before | after |
|---|---|---|
| 0.29 × 100 | 28.999999999999996 | 28.99 (a cent lower than the true 29.00) |
| 10.005 × 1 | 10.005 | 10 |
| 1.1 × 3 | 3.3000000000000003 | 3.3 |
| 19.99 × 3 | 59.97 | 59.97 |

- Most ordinary totals come out the same or are tidied (3.3000000000000003 becomes 3.3).
- Some totals can come out one cent lower than the exact amount, because of how floating-point numbers work.
- `nightlyTotal` is not called from anywhere else in this repository, so I could not check what the rest of the system does with the result.
- No test covers this function.

**Decision needed before merge:** either revert this line to `rate * nights` to keep the PR formatting-only, or keep it and add tests. If it stays, use proper rounding (`Math.round`) rather than rounding down, and the account manager should confirm that rounding to the cent is the intended billing rule.

## Files changed

| File | Change |
|---|---|
| `README.md` | Line wrapped into two lines |
| `src/export.js` | Formatting only |
| `src/list.js` | Formatting only |
| `src/mail.js` | Message body built from a list of lines, joined with newlines; same text |
| `src/pricing.js` | **Behavior change (above)** |
| `test/reminders.test.js` | Formatting only; same two tests, same assertions |

## Verification

- `npm test` (`node --test`): 5 tests, 5 passed, 0 failed, 0 skipped, exit code 0. These cover the CSV export, reminder subject and body, and reminders due within 24 hours.
- DoD-Guard stub and empty-function scans: 0 issues in 8 files.
- Probe of `nightlyTotal` with `node -e`: output is in the table above.
- Not covered by tests: `src/pricing.js` and the `src/list.js` listing.
