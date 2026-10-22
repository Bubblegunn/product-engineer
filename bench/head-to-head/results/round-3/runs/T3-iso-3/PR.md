# Format the code, and a price change that needs a decision

## Summary

This branch reformats the code (line breaks, quote style, trailing commas). It also contains **one change to how stay totals are calculated**. The commit message says "no functional change", but that is not true for this one file.

## Needs a decision: stay totals can be one cent too low

`src/pricing.js` changes how the total for a stay is calculated:

```diff
-  return rate * nights;
+  return Math.floor(rate * nights * 100) / 100;
```

The new line cuts the total off at whole cents instead of rounding it. Computers store many prices (such as 0.29) with a tiny error, so the cut-off can land one cent too low.

- Example: a rate of 0.29 for 100 nights should total 29.00. The new code returns **28.99**.
- I tried every rate from 0.01 to 3.00 for 1 to 14 nights. The new code gave a different answer from normal rounding in 430 of 4,200 cases. I only tested rates up to 3.00. I have not checked how often this happens at real hotel rates.
- Before this branch, no rounding was applied at all.

What this means for hotels: a guest could be shown a total one cent lower than the true price. That might affect invoices or reports that rely on this total.

**Recommendation:** remove this change from the branch, so it only contains formatting. If rounding to cents is wanted, it should be a separate pull request that rounds normally (or works in whole cents) and has tests. The repository has no tests for pricing today.

## Formatting only (no change in behaviour)

- `src/export.js`: the CSV export line is split over several lines and uses double quotes. The output is the same.
- `src/list.js`: the one-line function is spread over three lines.
- `src/mail.js`: the reminder email body is built from a list of lines joined with line breaks instead of one long string. The text guests receive is the same. The export list is also spread over several lines.
- `test/reminders.test.js`: quotes and line breaks only. The tests check the same things.
- `README.md`: the description is split over two lines. It reads the same.

## Testing

- I checked the diff by reading it. The only change in behaviour is the `src/pricing.js` line above.
- I did not run `npm test` for this description. The existing tests cover reminders only, not pricing.
