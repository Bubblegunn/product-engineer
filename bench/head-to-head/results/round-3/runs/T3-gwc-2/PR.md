# Format the code, and a change to how stay totals are calculated

## Summary

This PR reformats the code (line breaks, quote style, spacing) so it is easier to read. Guests and hotel staff see no difference from the formatting.

**One change is not formatting.** `src/pricing.js` now rounds the total for a stay down to whole cents. The commit message says "no functional change", which is not accurate for this file. Details are below.

## Behaviour change: stay totals (`src/pricing.js`)

- **Before:** total = nightly rate × number of nights, with no rounding.
- **After:** the same product, rounded **down** to 2 decimal places (`Math.floor(rate * nights * 100) / 100`).

**Impact for hotels and guests**
- For whole-cent rates (for example 89.99 × 3), the total is normally unchanged. Floating-point error can still shave off a cent, because rounding down turns a result like 269.96999… into 269.96.
- For rates with fractional cents, the total is now truncated and never rounded to the nearest cent. The amount shown can be up to one cent lower than before.
- Any hotel that compares totals with earlier invoices or exports could see small differences.

**Decision for the reviewer:** I recommend not shipping this inside a formatting PR. Either revert that one line here and move it to its own PR, or keep it and confirm that rounding down is intended. Round-to-nearest may be what was meant. No test covers `nightlyTotal`, so that needs adding either way.

## Formatting-only changes (same behaviour)

- `README.md`: the description is split over two lines.
- `src/export.js`: the CSV export is wrapped over several lines and uses double quotes. The output is identical.
- `src/list.js`: `listBookings` is expanded to a multi-line function.
- `src/mail.js`: the reminder email body is built from a list of lines instead of one long string. I compared the old and new text and they are identical. The exports are also spread over several lines.
- `test/reminders.test.js`: quote style and line wrapping only. The same two cases are tested.

## Testing

I compared the diff by reading it. I did not run the test suite for this description. Existing tests cover reminders, mail and export, and none cover pricing.
