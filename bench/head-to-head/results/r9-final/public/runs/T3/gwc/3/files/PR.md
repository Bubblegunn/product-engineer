# Format the code, plus one pricing change that needs a decision

## Summary

This PR reformats several files: line wrapping, double quotes, and multi-line layout. Almost all of it changes layout only. **One change is not formatting. It alters how stay totals are calculated (see below).**

## Behaviour change: stay totals are now rounded down to the cent

`src/pricing.js`, `nightlyTotal`:

```diff
-  return rate * nights;
+  return Math.floor(rate * nights * 100) / 100;
```

- **Before:** the total is the nightly rate times the number of nights, unrounded.
- **After:** the total is cut down (never rounded up) to two decimals.
- **Effect:** whenever the rate has more than two decimals, the total can be up to 1 cent lower than before. For example, a rate of 33.333 over 3 nights gives 99.99 instead of 99.999. With ordinary two-decimal rates the result is usually unchanged. Floating-point error can still push a total down by 1 cent, for example 0.07 × 100 = 7.000000000000001, which is fine, but 1.15 × 100 = 114.99999999999999, which floors to 1.14.
- **Why this matters:** this function produces the amount a guest is charged, so the change affects money. It has no test coverage.

This was not mentioned in the commit message ("no functional change"). **Decision needed before merge:** either keep it deliberately (with a test, and probably `Math.round` rather than `Math.floor`), or revert that line and handle rounding in a separate PR. I'd suggest the revert.

## Formatting-only changes (no behaviour change)

- `src/export.js`: the CSV builder is wrapped over several lines and uses double quotes. The output is the same.
- `src/list.js`: `listBookings` is expanded to a multi-line body.
- `src/mail.js`: the reminder email body is built from a list of lines joined with `\n` instead of one long template string. The resulting text is identical, so guests receive the same email. The export is also spread over multiple lines.
- `test/reminders.test.js`: quotes and wrapping only. The tests are unchanged.
- `README.md`: one sentence is split over two lines. It renders the same.

## Testing

I compared the diff by hand. I have not run the test suite for this description, and no test covers `nightlyTotal`.
