# Format the code (includes one pricing change that needs a decision)

## Summary

This branch reformats six files for consistent style: line wrapping, quote style and trailing commas. Five of the six changes do not change behavior.

**The sixth does change behavior.** The commit message says "no functional change", but `src/pricing.js` now computes stay totals differently. See the next section.

## Pricing change: please review before merging

`nightlyTotal` in `src/pricing.js` used to return `rate * nights`. It now returns `Math.floor(rate * nights * 100) / 100`, which **rounds the total down to a whole cent**.

- **Whole-cent rates (e.g. 89.99 × 3 nights):** the result is the same in most cases. Floating-point error can occasionally push a total a cent lower. A rate of 0.29 × 100 nights is one example.
- **Rates with fractions of a cent (e.g. 33.333 × 3 nights):** the total used to be 99.999 and is now 99.99. The total was not rounded before.
- **Effect for hotels:** a guest's total can come out up to one cent lower than before. Rounding down always favors the guest, never the hotel.
- **Testing:** no test covers `nightlyTotal`, so nothing in the repo shows this was intended.

I don't know whether this was deliberate. Two options:

1. If it was intended, move it into its own commit with a test, and describe it as a pricing change.
2. If it wasn't, revert that one line to `return rate * nights;`.

Account manager note: if the change stays, it would be worth telling the hotel owner that totals are now rounded down to the cent.

## Other changes (formatting only)

- `src/export.js`: the CSV header and rows are wrapped across lines and use double quotes. The CSV output is the same.
- `src/list.js`: `listBookings` is expanded to a multi-line function body.
- `src/mail.js`: the reminder email body is built from a list of lines joined with newlines instead of one long string. The text is the same: greeting, "Your stay at … starts tomorrow. Check-in opens at …", "See you soon!".
- `README.md`: the description is split across two lines. The wording is unchanged.
- `test/reminders.test.js`: quotes and line wrapping only. The test cases and assertions are unchanged.

## Testing

Tests were not run for this description. I only read the git history and the diff against `main`. The formatting claims above come from reading the diff line by line.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
