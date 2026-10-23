# Format the code, and fix one commit that also changes prices

## Summary

This pull request reformats the code. It also contains one price change that the commit message does not mention. That change can charge guests one cent too little, so **do not merge until it is removed or fixed**.

## What you need to know

- **Layout changes:** Five files were reformatted. Nothing about how they work changed. Guests see the same reminder emails and the same CSV export.
- **Price change:** `nightlyTotal` in [`src/pricing.js`](src/pricing.js) now rounds the total down to whole cents. Before, it returned `rate * nights` unchanged.
- **Wrong cents:** Computers store some decimal numbers with tiny errors. Rounding down turns those errors into a lost cent. For example, 1 night at 1.15 now returns 1.14. A rate of 0.29 for 100 nights returns 28.99 instead of 29.
- **Not covered by tests:** No test checks `nightlyTotal`, so the test run cannot catch this.

## Decision needed

Choose one option before merge:

1. **Remove the change (recommended):** Restore `return rate * nights;` in `src/pricing.js`. This keeps the pull request a pure formatting change, as its commit message says.
2. **Keep rounding, do it correctly:** Use `Math.round(rate * nights * 100) / 100` and add a test with the examples above. Make this a separate pull request, because it changes what guests pay.

## For the hotel owner's account manager

If you want prices rounded to cents, that is a product decision. Please confirm the rounding rule (round to nearest, or always down) before we ship it. Today's behavior, with no rounding, is unchanged once option 1 is applied.

## Files changed

| File | Change |
|---|---|
| `README.md` | One sentence split over two lines |
| `src/export.js` | Line breaks in `toCsv`; double quotes |
| `src/list.js` | Function body on separate lines |
| `src/mail.js` | Reminder text built from a list of lines; same output |
| `src/pricing.js` | **Changes behavior** (see above) |
| `test/reminders.test.js` | Line breaks; double quotes |

## How to check

Run `node --test`. The existing reminder tests should pass. They do not cover prices.
