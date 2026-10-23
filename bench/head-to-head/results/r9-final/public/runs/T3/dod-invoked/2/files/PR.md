# style: format the code (contains one pricing change, see below)

## Summary

This branch reformats the code: quote style, line wrapping and trailing commas. It also contains **one change that is not formatting and does change behavior: the nightly price calculation in `src/pricing.js`.**

The commit message says "no functional change". That is true for every file except `src/pricing.js`.

## Behavior change: stay totals (`src/pricing.js`)

| | Before | After |
|---|---|---|
| `nightlyTotal(rate, nights)` | `rate * nights` | `Math.floor(rate * nights * 100) / 100` |

The new code rounds the total **down** to the cent. The floating-point multiplication by 100 can land just below a whole number, so some totals come out one cent too low. I checked this by running the function:

| Rate | Nights | Correct total | New result |
|---|---|---|---|
| 10.03 | 1 | 10.03 | **10.02** |
| 10.01 | 7 | 70.07 | **70.06** |
| 10.03 | 2 | 20.06 | **20.05** |

I tried every rate from 10.00 to 299.99 in one-cent steps, with 1, 2, 3 and 7 nights. That is 116,000 combinations. Some of them (including the three above) come out one cent lower than the correct total.

**For the hotel owner and account manager:** if `nightlyTotal` feeds guest-facing prices or invoices, some stays would be undercharged by 1 cent. This change should not ship under a "formatting only" label. Decision needed before merge: either revert this line to `rate * nights`, or keep rounding and use correct rounding (for example `Math.round`) with tests. I have not changed the code. This PR only describes it.

## Formatting-only changes (no behavior change)

- `src/export.js`: the CSV builder is wrapped over several lines and uses double quotes. The output is identical.
- `src/list.js`: the one-line function is expanded to a block.
- `src/mail.js`: the reminder body is built from an array joined with `\n`. The text is identical. The exports are spread over several lines.
- `test/reminders.test.js`: quotes and wrapping only. The same two tests with the same assertions.
- `README.md`: one sentence is split across two lines. It renders the same.

Guest reminder emails and the CSV booking export are unchanged.

## Testing and verification

- `npm test` (`node --test`): 5 tests, 5 pass, 0 fail, 0 skipped, exit code 0. No tests were removed or skipped.
- Stub, TODO and empty-function scans: 0 issues across 8 files.
- **There is no test for `nightlyTotal`.** The test suite passes even though the price change above gives wrong totals.
- End-to-end check: I ran `nightlyTotal` directly in Node. That is how the rounding errors above were found.

## DoD-Guard result

`/dod:verify` result: **FAIL**. The stub scan and the tests pass, but the undocumented pricing change and the missing pricing test are not acceptable under the Definition of Done. See the verify report for details.
