# style: format the code (contains one price calculation change)

## Summary

This PR reformats the code: line breaks, quote style and trailing commas. Nothing visible to guests or hotels changes, with **one exception**. The commit message says "no functional change", but that isn't true for `src/pricing.js`. See below.

## Needs a decision: stay total calculation changed

`nightlyTotal` in `src/pricing.js` used to return `rate * nights`. It now returns `Math.floor(rate * nights * 100) / 100`, which rounds the total **down** to whole cents.

This is not formatting, and it can produce a wrong amount. Computers store decimal prices with tiny errors, and rounding down turns those errors into a missing cent. For example, a rate of 1.13 for 3 nights should total 3.39, but the new code returns 3.38. The old code gave 3.3899999999999997, which displays as 3.39 when rounded for display.

Impact: any total calculated through `nightlyTotal` can come out 1 cent lower than the correct amount, for some rates and night counts. I found this by checking rates from 1.00 to 200.00. I have not checked where the function's output is used (invoices, exports, etc.).

Options before merging:
- **Revert that line** to `return rate * nights;` (my recommendation, since this is a style PR), or
- Keep deliberate rounding, but round to the nearest cent (`Math.round`) and move it to its own PR with a test.

I have not changed the code. This is the author's call.

## Formatting changes (no behaviour change)

- `README.md`: the description is split over two lines.
- `src/export.js` (CSV export): the long line is wrapped and quotes changed to double quotes. Output is identical.
- `src/list.js`: the one-line function is expanded.
- `src/mail.js` (reminder email): the body is built from a list of lines joined with newlines instead of one long string. The email text is identical: same greeting, check-in line and sign-off, with the same blank lines between them. The export block is also spread over several lines.
- `test/reminders.test.js`: reformatted, with the same checks.

Note: the style is not fully consistent. The files `export.js`, `list.js` and the test use double quotes, while `mail.js` still uses single quotes.

## Testing

I only compared the diff by reading it. I did not run the test suite, and no test covers `nightlyTotal`.
