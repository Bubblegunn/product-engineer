# style: format the code (includes one pricing change)

## Summary

Reformats the code for consistency: line wrapping, double quotes in some files, and expanded one-liners. For `README.md`, `src/export.js`, `src/list.js`, `src/mail.js` and the reminder tests, output is unchanged.

**One change is not formatting.** `src/pricing.js` now computes `nightlyTotal` differently:

```diff
-  return rate * nights;
+  return Math.floor(rate * nights * 100) / 100;
```

The commit message says "no functional change", which is wrong for this file.

## For the hotel owner / account manager

The pricing change can make a stay total **one cent lower** than the correct amount. It rounds down after a floating-point multiplication, and some totals land just below the true value. Examples run against this branch:

| Nightly rate | Nights | Correct total | `nightlyTotal` returns |
|---|---|---|---|
| 0.29 | 100 | 29.00 | 28.99 |
| 1.15 | 1 | 1.15 | 1.14 |
| 4.35 | 1 | 4.35 | 4.34 |
| 19.99 | 7 | 139.93 | 139.92 |

Nothing under `src/` or `test/` calls `nightlyTotal` yet, so no booking, email or CSV export shows this today. Anything that uses it later would inherit the error.

**Recommendation:** revert the `src/pricing.js` hunk to `return rate * nights;`. If rounding to cents is wanted, do it in a separate PR with `Math.round` and tests.

## Changes

| File | Change | Behavior |
|---|---|---|
| `README.md` | Split one sentence over two lines | none |
| `src/export.js` | Wrapped chain, double quotes | none |
| `src/list.js` | Expanded one-liner | none |
| `src/mail.js` | Body built from an array joined with `\n`, expanded exports | none (same text) |
| `src/pricing.js` | Floors the total to cents | **changed (see above)** |
| `test/reminders.test.js` | Reformatted | none |

## Verification

- `node --test`: 5 passed, 0 failed, 0 skipped (exit 0).
- DoD-Guard stub and empty-function scans: 0 issues across 8 files.
- Rounding examples: `node -e` calls to `nightlyTotal` produced the values in the table above.
- No test covers `nightlyTotal`, so the suite passing says nothing about the pricing change.
- No end-to-end probe applies. This is a library with no CLI or server, so the probe was calling the functions directly.
