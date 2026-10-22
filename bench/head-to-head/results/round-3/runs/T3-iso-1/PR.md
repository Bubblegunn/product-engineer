# Format the code, and round stay totals down to whole cents

## Summary

This change mostly tidies the layout of the code. Guests and hotel owners will see no difference from it. It also contains **one change that affects prices**: stay totals are now rounded down to whole cents.

## Change that affects prices

`nightlyTotal` in `src/pricing.js` used to return the nightly rate times the number of nights, unrounded. It now rounds that total **down** to two decimal places.

- Rates with at most two decimal places, such as 89.99, give the same total as before apart from floating-point error.
- A rate with more decimal places, such as 33.333, now loses the extra fraction. For 3 nights the total was 99.999 and is now 99.99. It is rounded down, not to the nearest cent.
- Floor rounding on floating-point numbers can also lose a cent that was never in the rate. For example, 0.145 × 100 evaluates to 14.499999999999998, which floors to 14. Totals should be tested with such values before release.

This change was not meant to be part of a formatting commit, and it has no test. The hotel owner and their account manager should decide whether rounding down is the intended rule. Rounding to the nearest cent is the more common choice.

## Formatting only (no change in behaviour)

- `src/export.js`: the CSV export is split over several lines and uses double quotes. The output is identical.
- `src/list.js`: `listBookings` is written over several lines.
- `src/mail.js`: the reminder email body is built from a list of lines joined with newlines. The text is identical, so guests get the same email.
- `src/mail.js`: the exports are listed one per line.
- `test/reminders.test.js`: layout and quote style only. The tests are the same.
- `README.md`: the one-line description is split into two lines.

## Testing

I read the full diff against `main`. I did not run the tests, and there is no test for the rounding change.

Suggested before merging:

- Run the existing test suite.
- Add tests for `nightlyTotal` covering whole-cent rates and rates with extra decimals.
