# style: format the code (includes one pricing change)

## Summary

This PR reformats the code: line breaks, quote style and trailing commas. It also contains **one change that is not formatting and does change behaviour**: the stay total calculation in `src/pricing.js`. The commit message says "no functional change", which is not accurate for that file.

## Behaviour change: stay totals (`src/pricing.js`)

`nightlyTotal(rate, nights)` used to return `rate * nights`. It now returns `Math.floor(rate * nights * 100) / 100`, which cuts the total off at two decimal places instead of rounding it.

- Most totals come out the same. Example: 19.99 × 3 gives 59.97 before and after.
- Some totals come out one cent lower, because of how decimal amounts are stored in floating point. Example: a rate of 1.15 for 1 night now gives 1.14, and 4.35 gives 4.34.
- Cutting off (rather than rounding) means a guest total can be a cent less than the rate implies. For the hotel, that is a small amount of lost revenue on affected bookings.

I don't know whether this was meant to be part of this PR. Either way it should not ship under a "no functional change" label. Options:

1. **Revert this line** and put any rounding change in its own PR, with tests and a decision on the rounding rule (for example round to the nearest cent).
2. **Keep it** only if the owner has confirmed the totals should be truncated. I think that is unlikely.

I recommend option 1. `pricing.js` has no tests today.

## Formatting-only changes (no behaviour change)

- `README.md`: the description is split across two lines.
- `src/export.js`: the CSV export is split over several lines and uses double quotes. The output is the same.
- `src/list.js`: the function body is expanded onto separate lines.
- `src/mail.js`: the reminder email body is built from a list of lines joined with `\n`. The text is the same as before. The exports are listed one per line.
- `test/reminders.test.js`: double quotes and wrapped lines. The tests are the same.

## What this means for hotels and guests

- Reminder emails (sent the day before arrival) and the CSV booking export are unchanged.
- Only the stay total calculation can differ, by at most one cent per stay, as described above.

## Testing

I compared the diff by reading it and checked the pricing examples above in Node. I did not run the test suite for this description. The existing tests cover reminders only, so nothing covers the pricing change.
