# Format the code, plus one pricing change that is not formatting

## Summary

This branch reformats several files: line wrapping, quote style, and expanding one-line functions. Nearly all of it changes how the code looks and not what it does.

**One change is not formatting.** `src/pricing.js` now rounds stay totals down to whole cents. The commit message says "no functional change", which is wrong for this line. See below.

## Behaviour change: stay totals are now rounded down

`nightlyTotal(rate, nights)` in `src/pricing.js` used to return `rate * nights` unchanged. It now returns `Math.floor(rate * nights * 100) / 100`.

- **Whole-cent rates:** most totals come out the same. For example, 89.50 × 3 is still 268.50. Floating-point error can occasionally push a total one cent lower, because the new code floors and doesn't round to nearest. 0.29 × 100 gives 28.999999999999996 in floating point, and flooring that gives 28.99 instead of 29.00.
- **Rates with fractions of a cent:** these used to pass through unrounded and are now truncated. For example, a rate of 33.333 × 3 nights was 99.999 and is now 99.99. Rounding down always favours the guest, so totals can only stay the same or drop by up to one cent.
- **Why it matters:** this affects the amount shown for a stay. Nothing in the diff says whether it was intended, and no test covers `nightlyTotal`.

**Decision needed from the author:** either (a) keep it and move it into its own commit or PR with tests and an accurate description, or (b) revert that line to `return rate * nights;`. I recommend (a) if the intent is to avoid showing fractional cents. If so, `Math.round` is probably the better choice because it avoids the one-cent floating-point drift above. This is a suggestion, and I haven't changed the code.

## Formatting-only changes

These should behave exactly as before:

- `src/export.js`: CSV export code wrapped across lines. The output is identical, and the quotes changed from single to double.
- `src/list.js`: `listBookings` expanded from a one-liner to a multi-line function.
- `src/mail.js`: the reminder email body is built from a list of lines joined with newlines instead of one long template string. The text is the same, with the same blank lines. The export list is also spread over several lines.
- `test/reminders.test.js`: wrapping and double quotes only. The tests are unchanged.
- `README.md`: one sentence split over two lines. It renders the same.

Note that `src/mail.js` still uses single quotes while the other files now use double quotes, so the formatting isn't fully consistent.

## For the hotel owner's account manager

- Guest reminder emails are unchanged. The wording and layout are the same.
- Booking CSV exports are unchanged.
- The one customer-visible risk is the price rounding above. Stay totals could differ by at most a cent, and only in the guest's favour. It's worth confirming whether that is wanted before this ships.

## Testing

I didn't run the tests for this description. The only existing tests cover reminders, and they have formatting changes only. Nothing exercises the pricing or export code.
