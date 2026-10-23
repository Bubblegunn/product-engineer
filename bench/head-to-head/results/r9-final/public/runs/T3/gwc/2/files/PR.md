# Format code, plus one pricing change

## Summary

This PR reformats the code (quotes, line wrapping, trailing commas). It also contains **one change that affects behavior**: stay totals are now rounded down to the cent. The commit message says "no functional change", which isn't accurate for that one line.

## Behavior change: stay totals (`src/pricing.js`)

`nightlyTotal(rate, nights)` used to return `rate * nights`. It now returns `Math.floor(rate * nights * 100) / 100`, which rounds the total **down** to 2 decimal places.

- Whole-cent rates give the same total as before, for example 89.50 × 3 = 268.50.
- Rates with fractions of a cent can now give a total up to 1 cent lower than before. This is rounding down, not to the nearest cent, so it always favors the guest.
- Floating-point error can also move a total by a cent. For example, a product that is mathematically exactly 0.29 can be computed as 0.28999… and floor to 0.28.

Nothing in the PR description or commit message mentions this, and no test covers it. If the rounding is intended, it should go in its own PR with tests and a note to the hotel. If it isn't, the line should be reverted to `return rate * nights;` before merge.

## Formatting only (no behavior change)

- `src/export.js`: the CSV builder is split across lines and uses double quotes. The output is identical.
- `src/list.js`: the one-line function is expanded to a block.
- `src/mail.js`: the reminder email body is built from an array joined with `\n` instead of one long template string. I compared the two and the text is identical, so guests get the same email. The export is also wrapped onto multiple lines.
- `test/reminders.test.js`: quotes and line wrapping only. The test logic is unchanged.
- `README.md`: one sentence is split into two lines.

## Testing

I only reviewed the diff against `main`. I did not run the test suite. The existing tests cover reminders only, so they don't exercise the pricing change.

## For the hotel owner and account manager

- Guest reminder emails and the CSV booking export are unchanged.
- The one thing that could be visible is the stay total in the pricing calculation, as described above. We recommend confirming the rounding is wanted before this is released.
