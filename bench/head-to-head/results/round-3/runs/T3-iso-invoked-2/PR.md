# Format the code, and a price rounding change that needs a decision

**Purpose:** Explain what branch `style/format-code` changes in stayhub, and ask reviewers to decide on one pricing change before merging.
**Readers:** Code reviewers first. The hotel owner's account manager second; the section "What this means for hotels" is written for them.
**Date:** 2026-10-22

## Summary

This branch reformats six files. It was meant to change no behaviour, but one line changes how stay totals are calculated. That line is in [`src/pricing.js`](src/pricing.js#L3).

- **Do not merge as it stands.** The pricing change was not announced in the commit message and can make a total one cent too low.
- **Recommended action:** Restore the original line in `src/pricing.js`, then merge. Ship any rounding rule in a separate pull request with its own tests.
- **Everything else is formatting only.** The other five files produce the same output as before.

## The pricing change

The commit message says "no functional change". That is true for five files and false for `src/pricing.js`.

Before:

```js
return rate * nights;
```

After:

```js
return Math.floor(rate * nights * 100) / 100;
```

The new line rounds every total down to whole cents. Computers store most prices as binary fractions, so `rate * nights * 100` can land just below a whole number. Rounding down then drops a full cent. I ran the new line in Node.js and got these results:

| Nightly rate | Nights | Correct total | Total after this branch |
|--------------|--------|---------------|-------------------------|
| 1.15 | 1 | 1.15 | 1.14 |
| 0.29 | 1 | 0.29 | 0.28 |
| 89.99 | 3 | 269.97 | 269.96 |
| 80 | 2 | 160 | 160 |

Whole-number rates, such as the last row, are not affected. No test covers `nightlyTotal`, so the test suite does not catch this.

## What this means for hotels

If merged as it stands, some guest totals would be one cent lower than the rate multiplied by the nights. Hotels would collect slightly less than they quote. The error depends on the rate, so it would appear for some hotels and not others, and it would be hard to spot in a bill.

If the line is restored, nothing changes for hotels. Guest reminder emails and the CSV export of bookings look the same as before.

## Formatting changes

These changes only move code or text across lines or change quote style. Output is identical.

- **README:** [`README.md`](README.md) splits one sentence pair onto two lines.
- **CSV export:** [`src/export.js`](src/export.js#L2-L4) wraps one long line and uses double quotes.
- **Booking list:** [`src/list.js`](src/list.js#L2-L4) puts the function body on its own lines.
- **Reminder email:** [`src/mail.js`](src/mail.js#L5-L15) builds the message from a list of lines joined by newlines. The text is the same as before.
- **Reminder tests:** [`test/reminders.test.js`](test/reminders.test.js) uses double quotes and wraps long lines.

## How I checked

- **Tests:** `node --test` passes all 5 tests.
- **Diff:** I read the full diff against `main`. Only `src/pricing.js` changes behaviour.
- **Not covered:** No test exercises `nightlyTotal`, so I checked it by running the new line directly.
