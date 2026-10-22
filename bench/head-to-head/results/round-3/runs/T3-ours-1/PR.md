# style: format the code (includes one price-calculation change)

For the customer:
What changed: Guests' reminder emails, the booking list and the CSV export of bookings look and read exactly as before. One thing is not cosmetic: the total price of a stay is now cut down to whole cents (never rounded up) instead of being used as calculated, so a total can come out a fraction of a cent, and in rare cases a whole cent, lower than before.
Why it matters: Hotel owners and their account managers should know that stay totals can differ slightly from what they showed before. Nothing else in this change affects guests or hotel staff.

## Technical detail

The commit message ("no functional change") is wrong for one file.

- `src/pricing.js`: `nightlyTotal` went from `rate * nights` to `Math.floor(rate * nights * 100) / 100`. This is a behaviour change. Because it floors floating-point products, a result like 3.45 that is stored as 344.99999… cents becomes 3.44. Decision needed before merge: either revert this line to keep the PR formatting-only, or keep it deliberately, move it to its own PR, add tests, and consider rounding to nearest instead of flooring. I did not change the code.
- `src/mail.js`: reminder body now built from a joined list of lines; I compared the text and it is identical. Export list reformatted.
- `src/export.js`, `src/list.js`, `test/reminders.test.js`, `README.md`: line breaks and quote style only (README splits one sentence over two lines).

## Checked

- Ran `npm test`: 5 passed, 0 failed.
- Not checked: no test covers `nightlyTotal`, so the price change is untested. I did not compare real totals before and after.
