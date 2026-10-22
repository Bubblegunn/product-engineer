# style: format the code (includes one price-calculation change)

**Analysis basis**

- Generated: `2026-10-22 06:42:04 UTC`
- Range: `2026-10-14` → `2026-10-21` (branch `style/format-code` vs `main`)
- Method: read-only git inspection (`git log`, `git diff main..HEAD`). Tests were not run.

---

## Summary

This PR reformats the code so it is consistent: line breaks, quote style and trailing commas. For guests and hotels, almost everything stays the same. **One change is not formatting: it alters how the total price of a stay is calculated.** It needs a decision before merge (see below).

## ⚠️ Needs attention: price calculation changed

`src/pricing.js`, `nightlyTotal(rate, nights)`:

- Before: `rate * nights`
- After: `Math.floor(rate * nights * 100) / 100`

The commit message says "no functional change", but this is a functional change. It rounds the total **down** to the cent. Because of floating-point arithmetic, it can also drop a cent from an exact total. For example, a rate of 1.15 for 1 night now gives **1.14** instead of 1.15. Other sums that are exact on paper, such as 0.29 × 100 nights, come out one cent low (28.99).

Impact: guests or hotels could see totals that are a cent too low in some cases. This could affect invoices or reports that use this function.

Suggested options:
- Remove this change from the PR, so it is truly formatting only. Handle price rounding in a separate PR with its own tests.
- Or keep it intentionally, but use proper rounding (`Math.round`) and add tests for the pricing function. There are currently none.

## 🎨 Formatting only (no behaviour change)

- **Booking CSV export** (`src/export.js`): same columns and output, with the code split across lines.
- **Booking list** (`src/list.js`): same behaviour, with the function body on separate lines.
- **Reminder email** (`src/mail.js`): the body is now built from a list of lines joined by newlines. The resulting text is identical. The module's export list is also reformatted.
- **Tests** (`test/reminders.test.js`): double quotes and line wrapping only. The checks are unchanged.
- **README**: one sentence is split into two lines. The wording is the same.

## Scope

6 files changed, 37 insertions, 16 deletions. No new features, dependencies or settings.

**Not verified:** I did not run the test suite. The existing tests cover reminders only, so they would not catch the pricing change.
