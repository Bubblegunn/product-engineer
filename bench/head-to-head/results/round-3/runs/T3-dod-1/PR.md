# Format the code, and fix an unintended price-rounding change

## Summary

This branch reformats the code (line breaks, quote style, trailing commas). It touches the README, the CSV export, the booking list, the reminder email text builder, pricing, and the reminder tests.

**One of the changes is not formatting.** The commit message says "no functional change", but `src/pricing.js` now behaves differently. See "Behavior change" below. It needs a decision before merge.

## For the hotel owner / account manager

- **Guest emails:** the reminder email text is unchanged. The code that builds it was only rearranged. The email reads the same: greeting, "Your stay at … starts tomorrow. Check-in opens at …", "See you soon!".
- **CSV export of bookings:** the output is unchanged.
- **Booking list and reminder timing:** unchanged.
- **Stay totals (pricing):** this is the exception. Totals are now rounded **down** to the cent. For some rates this makes a stay total **1 cent lower** than before. See below.

## Behavior change: `nightlyTotal` (src/pricing.js)

Before: `rate * nights`
After: `Math.floor(rate * nights * 100) / 100`

This was most likely added by accident or by an editor/tool, since it isn't formatting. The effect:

| rate | nights | before | after | correct total |
|------|--------|--------|-------|---------------|
| 80 | 2 | 160 | 160 | 160 |
| 19.99 | 3 | 59.97 | 59.97 | 59.97 |
| 1.1 | 3 | 3.3000000000000003 | 3.3 | 3.30 |
| 19.99 | 7 | 139.92999999999998 | **139.92** | **139.93** |

Good: floating-point noise such as `3.3000000000000003` is gone.
Bad: because it floors, some totals lose a cent. 19.99 × 7 nights should be 139.93 but is now 139.92. That undercharges the guest by 1 cent on that booking.

**Recommendation:** either revert this line to `rate * nights` to keep the PR a pure formatting change, or keep a rounding fix in a separate PR using `Math.round` (and a test). I have not changed the code. The author should decide, and the account manager should confirm before totals change for hotels.

## Files changed

- `README.md`: one line split into two.
- `src/export.js`, `src/list.js`, `src/mail.js`: formatting only (verified by reading the diff; email text and CSV format are identical).
- `src/pricing.js`: **behavior change**, see above.
- `test/reminders.test.js`: formatting only. No tests deleted, skipped or weakened.

## Testing

```
$ npm test
# tests 5
# pass 5
# fail 0
# skipped 0
```

The existing suite doesn't cover `nightlyTotal`, `toCsv` or the mail text. That is why the pricing change passes the tests. The table above was produced by calling `nightlyTotal` directly in Node.

No new tests are added because this PR is meant to be formatting only. If the rounding change is kept, it needs a test.
