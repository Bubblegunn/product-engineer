# Format the code, plus one pricing change that is not formatting

## Summary

This branch reformats the code: line breaks, quote style and layout. Guest emails, the CSV export and the booking list behave exactly as before.

**It also contains one change that does affect behaviour.** The commit message says "no functional change", and that is not true for `src/pricing.js`. Please read the next section.

## Behaviour change: stay totals are now rounded down to the cent

`nightlyTotal` in `src/pricing.js` used to return `rate * nights`. It now returns `Math.floor(rate * nights * 100) / 100`, which truncates the total to two decimals.

- Rounding down can leave a total one cent too low. This happens when floating-point arithmetic puts the product just under the exact value. I ran it:
  - `nightlyTotal(1.15, 1)` returns **1.14**, not 1.15.
  - `nightlyTotal(4.35, 1)` returns **4.34**, not 4.35.
  - `nightlyTotal(0.29, 100)` returns **28.99**, not 29.00.
  - Rates like 19.99 × 3 nights still come out right (59.97), so the error depends on the amounts.
- The old code could return many decimals, but it never returned a total that was too low.
- No test covers pricing, so nothing in the suite would catch this.

**Recommendation:** revert this line to `return rate * nights;` in this PR. If the team wants cent-rounding, do it in a separate PR with tests and a decision on the rounding rule. Rounding to the nearest cent (or working in integer cents) would avoid the errors above. Hotel owners should know before any change that alters the amount shown to guests.

## Formatting-only changes (no behaviour change)

- `README.md`: the one-line description is split over two lines.
- `src/export.js`: the CSV builder is wrapped over several lines and uses double quotes. The output is identical.
- `src/list.js`: `listBookings` is expanded to a multi-line function.
- `src/mail.js`: the reminder body is built from an array joined with `\n` instead of one long template string. The text is identical: same greeting, same check-in line, same sign-off, same blank lines. The exports are laid out one per line.
- `test/reminders.test.js`: quote style and line wrapping only. The tests assert the same things.

## Testing

I compared the diff by hand and ran the pricing examples above in Node. I did not run the test suite for this description.
