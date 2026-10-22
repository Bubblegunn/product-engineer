# Format the code, and one price calculation change

## Summary

This branch tidies the layout of the code. It also contains **one change that affects prices**. The commit message says "no functional change", but that is not true for `src/pricing.js`.

## Change that affects customers: stay totals

`nightlyTotal` in `src/pricing.js` used to return the nightly rate times the number of nights. It now rounds that total **down** to whole cents.

- Before: `rate * nights`
- After: `Math.floor(rate * nights * 100) / 100`

What this means:

- Totals that are already whole cents do not change. For example, 80.00 × 3 stays 240.00.
- Totals with a fraction of a cent are now cut off, never rounded to the nearest cent. For example, a rate of 33.333 over 3 nights gives 99.99 instead of 99.999.
- Some totals could come out one cent lower than before, because of how computers store decimal numbers.

Please confirm this is intended. If it is not, the single line in `src/pricing.js` should go back to `rate * nights`. If it is intended, it should have its own commit, a test and a note for the hotel owner. It should not be hidden in a formatting change. I have not added a test for it here.

## Formatting changes (no change in behaviour)

- `src/export.js`: the CSV export code is split over several lines. The CSV output is the same.
- `src/list.js`: one function is written over several lines.
- `src/mail.js`: the reminder email text is built from a list of lines instead of one long string. I checked that the email text is identical. The export list is also spread over several lines.
- `test/reminders.test.js`: quote style and line breaks only. The tests check the same things.
- `README.md`: one sentence is split over two lines.

## What was not checked

I compared the code by reading the differences. I did not run the tests.
