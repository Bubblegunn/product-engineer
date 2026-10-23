# Tidy code layout, and a change to how stay totals are rounded

For the customer:
What changed: Stay totals are now cut down to whole cents (never rounded up), so a total that used to come out with extra decimals now shows at most two. Reminder emails, the booking list and the CSV export are unchanged in what they show.
Why it matters: Totals are always a clean amount of money. The cut-down can come out one cent lower than ordinary rounding, so the hotel owner should know about it before this goes live.

## What each part of the diff does

- `src/pricing.js`: **this is a behaviour change, not formatting.** `nightlyTotal` used to return rate × nights. It now returns that amount cut down to two decimals (`Math.floor(rate * nights * 100) / 100`). No test covers it, so I have not checked what it returns for real rates. Because of how computers store decimals, some amounts may come out one cent lower than expected (for example 0.29 × 100 is stored as 28.999…, which cuts down to 28 cents). I did not test this.
- `src/mail.js`: the reminder body is now built from a list of lines joined by line breaks instead of one long string. I compared the two by reading: same text, same blank lines.- `src/export.js`: the header and rows are the same, just split across lines and with double quotes. Traced by reading.
- `src/list.js`: the one-line function is spread over three lines. Traced by reading.
- `test/reminders.test.js`: quotes and line breaks only. The checks are the same.
- `README.md`: the sentence is split into two lines.

## Checked

- `npm test`: 5 passed, 0 failed.
- Not checked: pricing output (no test exists), and no real email, export file or booking list was opened.

## Open question

The title commit says "no functional change", which is not true of `src/pricing.js`. Either drop that line from this branch and ship it separately with a test, or keep it and confirm the cut-down rounding is wanted.
