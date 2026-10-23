# Format the code, plus one pricing change

## Summary

This PR reformats the code (quotes, line wrapping, trailing commas). It also contains **one behaviour change that is not formatting**: stay totals in `src/pricing.js` are now cut to whole cents. The commit message says "no functional change", which is not accurate for that file.

## Behaviour change: stay totals (`src/pricing.js`)

`nightlyTotal(rate, nights)` used to return `rate * nights`. It now returns `Math.floor(rate * nights * 100) / 100`.

- **What changes for the hotel:** totals are truncated (rounded down) to two decimals. Before, a total could carry extra decimals, for example a rate of 33.333 over 3 nights. Now the fractions of a cent are dropped.
- **Direction:** totals can only go down, by less than one cent per stay.
- **Possible bug:** because the code floors a floating-point product, some totals may come out one cent low. For example, `1.15 * 100` evaluates to `114.99999999999999`, so a total that should be 1.15 would become 1.14. I haven't tested this against real rates.
- **Not covered by tests:** no test exercises `nightlyTotal`.
- **Not stated as intended:** the branch doesn't say whether truncating is the intended rounding rule. Rounding to the nearest cent (`Math.round`) is the usual choice for billing.

**Decision needed before merge:** keep the rounding (and confirm floor vs. round with the hotel), or move it to a separate PR with tests and revert it here so this one is formatting only.

## Formatting only (no behaviour change)

- `src/export.js`: the CSV builder is wrapped over several lines and uses double quotes. The output is the same.
- `src/list.js`: `listBookings` is expanded to a multi-line function body.
- `src/mail.js`: the reminder body is built from an array joined with `\n` instead of one long template string. The text is identical, and the exports are listed one per line.
- `test/reminders.test.js`: quotes and wrapping only. The assertions are unchanged.
- `README.md`: the one-line description is split into two lines. The wording is unchanged.

## Guest-facing impact

The reminder email text is unchanged. The CSV export columns and format are unchanged. The only customer-visible effect is the possible total change described above.

## Testing

I reviewed the diff only and did not run the test suite. The existing tests cover reminders, not pricing, mail text or CSV export.
