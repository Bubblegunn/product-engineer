# Format the code (includes one price-calculation change)

## Summary

This branch reformats the code for consistency: line breaks, quote style, and splitting long lines. Guest emails, the CSV export, and the booking list work as before.

**One change is not formatting and affects prices.** `src/pricing.js` now rounds the total for a stay down to whole cents. The commit message says "no functional change", which is wrong for this line.

## What changed for users

Nothing, except the pricing change below.

- **Reminder email:** the text is identical. The code that builds it is laid out differently.
- **CSV export:** the output is identical.
- **Booking list:** the output is identical.
- **Tests:** `test/reminders.test.js` is reformatted only. The checks are unchanged.
- **README:** one sentence is split over two lines.

## Pricing change: needs a decision before merge

`nightlyTotal(rate, nights)` used to return `rate * nights`. It now returns `Math.floor(rate * nights * 100) / 100`, which drops any fraction of a cent.

- **Whole-cent rates (e.g. 89.50):** most totals come out the same.
- **Rates with fractions of a cent:** the total is now truncated instead of kept exact.
- **Some ordinary rates may come out one cent low.** Binary floating-point arithmetic makes `1.15 * 100` equal `114.99999999999999`, so a 1.15 rate for one night now gives 1.14. A guest could be undercharged by a cent on some bookings.

There are no tests for this function, so nothing in the suite would catch it.

**Options:**
1. Revert `src/pricing.js` to `rate * nights` to keep this a pure formatting PR. This is my recommendation.
2. If cent rounding is wanted, move it to a separate PR. That PR should use `Math.round` (or integer cents), have a description that says it changes prices, and include tests.

## Testing

I compared the diff by reading it. I did not run the test suite for this description.

## For the hotel owner's account manager

Nothing about the guest experience changes apart from the pricing line above. Please hold the release until that line is resolved, because it could shift totals by a cent on some bookings.
