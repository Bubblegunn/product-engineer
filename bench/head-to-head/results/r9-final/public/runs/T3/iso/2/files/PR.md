# Format the code, and one price calculation change

## Summary

This PR reformats the code so it is laid out consistently. It also contains **one change that is not formatting**: how a stay's total price is calculated. The commit message says "no functional change", which is not accurate for that file.

## What changed

**Formatting only** (the behaviour is the same as before):

- `README.md`: the description is split over two lines.
- `src/export.js`: the CSV export is laid out over several lines, with double quotes.
- `src/list.js`: the function body is on separate lines.
- `src/mail.js`: the reminder email text is built from a list of lines instead of one long string. The email text is identical. The exports are listed one per line.
- `test/reminders.test.js`: quotes and line breaks only. The tests check the same things.

**Behaviour change** (`src/pricing.js`):

- Before: the total for a stay was the nightly rate times the number of nights.
- Now: the total is rounded **down** to the cent (`Math.floor(rate * nights * 100) / 100`).

## Who this affects

Anything that shows or charges a stay total through `nightlyTotal` is affected.

- Totals with at most two decimals, such as 100.00 × 2 nights = 200.00, do not change.
- Rates with fractions of a cent, or floating-point error, can come out one cent lower than before. In a quick check, 0.29 × 1 night gave 0.28, where the old code gave 0.29.
- The change is not mentioned in the README, and no test covers it.

## Decision needed before merging

Pick one:

1. **Keep the rounding.** Then the commit and this PR should say so, and a test should be added for it. Hotel owners should be told that totals are rounded down.
2. **Drop the rounding.** Restore `return rate * nights;` in `src/pricing.js`, so this PR is formatting only.

I have not changed the code. I recommend option 2 unless the rounding was intended, because it lets the formatting go in without a risk to prices.

## Testing

I only read the diff and ran one small calculation to check the rounding example above. I did not run the test suite.
