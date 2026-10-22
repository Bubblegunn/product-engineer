# Format the code, and round stay totals down to the cent

## Summary

This branch mostly reformats the code so it is consistent and easier to read. Guests and hotels will see no difference from the reformatting.

**One change is not formatting.** The total price of a stay is now rounded down to whole cents. Before, it was the nightly rate times the number of nights, with no rounding. This can change the amount shown for a booking, so please read the section below.

## Change that affects behavior: stay price rounding

- **What changed:** `nightlyTotal` in `src/pricing.js` now returns `Math.floor(rate * nights * 100) / 100`.
- **Why it matters:** If a rate has fractions of a cent (for example 33.333 per night), the total used to keep them. Now it is cut off at the cent, always downward. The hotel never gets a total higher than the exact amount, and it can be up to one cent lower.
- **Not explained in the commit:** The commit message says "no functional change". That is wrong for this file. I found no stated reason for the rounding in the diff.
- **Before merging:** Please confirm the rounding is intended. If it is, it should have its own commit and a test. If not, revert `src/pricing.js` to `rate * nights`.

## Formatting only (no change to behavior)

- **Booking CSV export** (`src/export.js`): the code is split across lines. The CSV output is the same.
- **Booking list** (`src/list.js`): the one-line function is expanded. It still returns every booking.
- **Guest reminder email** (`src/mail.js`): the body is built from a list of lines joined with line breaks. The wording and layout are the same. The exports are also written on separate lines.
- **README**: one sentence is split into two lines. The text is the same.
- **Reminder tests** (`test/reminders.test.js`): quote style and line wrapping only. The test cases and checks are unchanged.

## Testing

- I did not run tests or the app. I checked this by reading the diff (6 files, +37/-16).
- The reminder tests were only reformatted, and nothing tests the new price rounding.
