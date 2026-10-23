# Format the code (and one pricing change that needs a decision)

**Analysis basis**

- Branch: `style/format-code` → `main`
- Range: 2026-10-21 (one commit: `8737e17`)
- Size: 6 files, +37 / −16
- Method: read-only git inspection (`git diff -w main..HEAD`). Tests were **not** run.

## Summary

This branch reformats the code to a consistent style (double quotes, wrapped long lines, trailing commas, expanded one-liners). The commit message says "no functional change". **That is true for every file except one**: `src/pricing.js` also changes how stay totals are calculated. Details below.

## ⚠️ Behaviour change: stay totals (`src/pricing.js`)

```diff
-  return rate * nights;
+  return Math.floor(rate * nights * 100) / 100;
```

Totals are now cut off (rounded down) at two decimals instead of being returned as calculated. This is a pricing change, not formatting.

- Most totals are unchanged (e.g. 19.99 × 3 = 59.97).
- Some totals drop by one cent because of floating-point arithmetic. For example, 89.99 × 3 was `269.97` (shown as 269.96999999999997 internally) and is now `269.96`; 0.29 × 1 becomes `0.28`.
- Guests could therefore be quoted or charged 1 cent less than the rate implies. That affects invoices and hotel revenue.

**Decision needed before merge:** either
1. remove this line from the PR and ship it separately, with tests and an explicit rounding rule (e.g. round to nearest cent), or
2. confirm the truncation is intended.

The pricing change has no test coverage in this branch.

## Formatting-only changes (no behaviour change)

- **CSV export** (`src/export.js`): same output, long line wrapped.
- **Booking list** (`src/list.js`): one-line function expanded.
- **Reminder email** (`src/mail.js`): the email text is built from a list of lines joined with newlines. The resulting text is identical, so guests see the same message.
- **Tests** (`test/reminders.test.js`): quotes and line wrapping only; same cases and assertions.
- **README**: one sentence split over two lines. It displays the same.

## For the hotel owner's account manager

- Guest reminder emails and CSV exports are unaffected.
- The only customer-visible risk is the possible one-cent difference in stay totals described above. We recommend this is resolved before release.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
