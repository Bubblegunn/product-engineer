# Format the code, plus an unintended change to stay totals

## Summary

This branch reformats the code (line wrapping, quotes, trailing commas). Almost all of it changes layout only. **One change is not formatting:** `src/pricing.js` now computes stay totals differently. The commit message says "no functional change", and that is wrong for this file.

## Needs a decision: stay totals can come out one cent lower

`nightlyTotal(rate, nights)` in `src/pricing.js` used to return `rate * nights`. It now returns `Math.floor(rate * nights * 100) / 100`, which cuts the result off at whole cents instead of rounding it.

Floating-point arithmetic often produces results like 209.92999999999998. Cutting those off drops a cent that should be there. Examples I ran:

| Rate | Nights | Before | After |
|------|--------|--------|-------|
| 29.99 | 7 | 209.92999999999998 | 209.92 (correct total is 209.93) |
| 1.15 | 1 | 1.15 | 1.14 |
| 0.29 | 100 | 28.999999999999996 (correct total is 29) | 28.99 |

Many totals are unaffected (19.99 × 3 stays 59.97), so this would be easy to miss in spot checks.

Nothing else in this repo calls `nightlyTotal` today, and no test covers it. If the app that uses stayhub calls it for guest-facing prices or invoices, those amounts could be a cent too low.

**Recommendation:** revert that line to `return rate * nights;` before merging. If rounding to cents is wanted, it should be a separate change that uses `Math.round` and has tests, and the hotel owner should agree to it first.

## Formatting-only changes (no behavior change)

- `README.md`: the description is split across two lines.
- `src/export.js`: the CSV builder is wrapped over several lines and uses double quotes. Output is identical.
- `src/list.js`: `listBookings` is expanded to multiple lines.
- `src/mail.js`: the reminder email body is built from an array joined with `\n` instead of one long string. I compared the two and the text is identical (greeting, the "starts tomorrow / check-in opens at" line, "See you soon!"). Guests will see no difference. The exports are also reformatted.
- `test/reminders.test.js`: quotes and line wrapping only. The tests check the same things.

Note: `src/mail.js` keeps single quotes while the other files switched to double quotes, so the formatting isn't fully consistent. It is harmless.

## Testing

I only read the diff and ran the pricing examples above in Node. I did not run the test suite.
