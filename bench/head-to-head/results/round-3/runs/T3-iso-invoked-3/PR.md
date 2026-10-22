# Format the code, and one price change that needs a decision

**Purpose:** Review the formatting changes on `style/format-code` and decide what to do about one change that alters stay prices.
**Readers:** Developers who review the code, and the hotel owner's account manager.
**Date:** 2026-10-22

## Summary

This branch reformats four source files, one test file and the README. Every change is layout only, except one.

The exception is in `src/pricing.js`. It changes how the total for a stay is calculated, so some totals will differ by one cent. The commit message says "no functional change", which is wrong for this file. We recommend moving that change into its own pull request, or removing it, before merging.

## Decision needed: the price change

`nightlyTotal` multiplies the nightly rate by the number of nights. The branch adds rounding down to whole cents.

Before:

```js
return rate * nights;
```

After:

```js
return Math.floor(rate * nights * 100) / 100;
```

Rounding down can take a cent off a correct total. Computers store some decimal amounts with tiny errors, and rounding down turns a tiny error into a lost cent. Example:

| Nightly rate | Nights | Total before | Total after |
|--------------|--------|--------------|-------------|
| 1.15 | 1 | 1.15 | 1.14 |
| 89.995 | 1 | 89.995 | 89.99 |
| 100 | 2 | 200 | 200 |

The table's first row shows the problem: a rate of exactly 1.15 loses a cent.

**Account manager:** Nothing calls `nightlyTotal` yet, so no guest or invoice is affected today. Any future use would be affected.

**Options:**

- **Separate it:** Move the pricing change to its own pull request, with tests and a decision on rounding (nearest cent, or down).
- **Remove it:** Revert `src/pricing.js` to the original line. Then the commit message is accurate.

## Layout changes with no effect on behaviour

- **`src/export.js`:** The CSV export builds the same text, split over several lines, with double quotes.
- **`src/list.js`:** `listBookings` is now written over three lines.
- **`src/mail.js`:** The reminder email body is built from a list of lines joined by newlines. The text is identical to before.
- **`test/reminders.test.js`:** The tests use double quotes and shorter lines. They check the same things.
- **`README.md`:** The description is split into two lines. The wording is unchanged.

## How we checked

- **Tests:** We ran `node --test`. All 5 tests pass. No test covers `nightlyTotal`, so the tests do not show the price change.
- **Email text:** We compared the old and new reminder body by reading the diff. The strings match.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
