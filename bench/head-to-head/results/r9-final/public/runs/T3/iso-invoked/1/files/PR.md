# Format the code, and a price rounding change that needs a decision

**Purpose:** Explains what this pull request changes, so reviewers can approve it and the hotel owner's account manager can see the effect on prices.
**Readers:** Code reviewers first. The account manager second.
**Date:** 2026-10-23

## Summary

This pull request mostly reformats code. The commit message says "no functional change", but that is not true for one line.

- **Prices change.** `nightlyTotal` now cuts a stay total down to whole cents. It used to return the exact product.
- **Everything else is formatting.** Line breaks, quote style and layout only. Behaviour is the same.
- **Decision needed.** Either keep the rounding on purpose, or remove it from this pull request. See "Decision needed" below.

## What changes for guests and hotels

A stay total is the nightly rate times the number of nights. Computers store decimal numbers with tiny errors. For example, 0.29 times 100 comes out as 28.999999999999996.

The new code multiplies by 100, drops everything after the whole number, and divides by 100. It never rounds up. So a total can fall one cent below the correct amount.

| Rate | Nights | Correct total | Old result | New result |
|------|--------|---------------|------------|------------|
| 0.29 | 100 | 29.00 | 28.999999999999996 | 28.99 |
| 89.90 | 3 | 269.70 | 269.70000000000005 | 269.7 |
| 100.00 | 2 | 200.00 | 200 | 200 |

Most real totals come out the same. Some come out one cent lower. Any amount shown to guests, or exported, that comes from `nightlyTotal` can be affected. We found no other callers of `nightlyTotal` in `src` or `test`.

## Decision needed

Choose one of these before merging:

1. **Keep cent rounding on purpose.** Replace `Math.floor` with `Math.round` so totals are never a cent too low. Add a test. Describe it in its own commit.
2. **Remove it from this pull request.** Restore `return rate * nights;` in [`src/pricing.js:3-4`](src/pricing.js) and ship the rounding separately.

We recommend option 1 or 2 over merging as is. The change was probably an accident, and no test covers it.

## Formatting changes (no effect on behaviour)

- **[`README.md`](README.md):** The intro sentence is split over two lines.
- **[`src/export.js`](src/export.js):** The comma-separated values (CSV) export uses double quotes and breaks the long line. Output is the same.
- **[`src/list.js`](src/list.js):** `listBookings` is spread over three lines.
- **[`src/mail.js`](src/mail.js):** `reminderBody` builds the same email text from a list of lines joined with newlines. The exports are listed one per line.
- **[`test/reminders.test.js`](test/reminders.test.js):** Double quotes and line breaks only. The tests are unchanged.

## How we checked

We compared the diff against `main` file by file. We ran the rounding formula on sample rates, shown in the table above.
