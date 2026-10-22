# Format the code, and one price change that needs a decision

Purpose: Review the formatting changes on `style/format-code`, and decide what to do about one change that alters guest prices.
Readers: Developers who review the code, and the hotel owner's account manager.
Date: 2026-10-22

## Overview

This branch reformats five source files and the README. Every change is layout only, except one.

- **Price change:** The nightly total in `src/pricing.js` now cuts off fractions of a cent. The commit message says "no functional change", so this is a mistake.
- **Effect:** Some totals come out one cent lower than before. Example: a rate of 0.29 for 1 night gave 0.29 before and gives 0.28 now.
- **Recommendation:** Restore the original line in `src/pricing.js` before merging. The rest of the branch is safe to merge.

## What changed in the price calculation

The function `nightlyTotal` multiplies the nightly rate by the number of nights. The branch wraps that result in rounding code, see [`src/pricing.js:L3-L4`](file:///tmp/claude-0/-home-user-product-engineer/9a6072d1-b5d0-5abe-abb5-153ce4275008/scratchpad/pe-work-r3/runs/T3-iso-invoked-1/repo/src/pricing.js#L3-L4).

```diff
-  return rate * nights;
+  return Math.floor(rate * nights * 100) / 100;
```

Computers store decimal prices as binary fractions, so a result such as 0.29 can be held as 0.28999…. `Math.floor` rounds down, so it turns that value into 0.28. I ran the new code on sample values:

| Rate | Nights | Before | After |
|------|--------|--------|-------|
| 0.29 | 1 | 0.29 | 0.28 |
| 1.15 | 1 | 1.15 | 1.14 |
| 19.99 | 3 | 59.97 | 59.97 |
| 100 | 3 | 300 | 300 |

Whole-number rates are unaffected. Rates with cents can be one cent too low.

If you want totals rounded to the cent, that is a separate change. It needs its own commit, its own tests, and a rounding rule the hotel owner agrees to (round to nearest, not down).

## Layout-only changes

I checked each of these by comparing the code before and after. They produce the same output as before.

- **README:** [`README.md:L3-L4`](file:///tmp/claude-0/-home-user-product-engineer/9a6072d1-b5d0-5abe-abb5-153ce4275008/scratchpad/pe-work-r3/runs/T3-iso-invoked-1/repo/README.md#L3-L4) splits one sentence per line.
- **CSV export:** [`src/export.js:L2-L4`](file:///tmp/claude-0/-home-user-product-engineer/9a6072d1-b5d0-5abe-abb5-153ce4275008/scratchpad/pe-work-r3/runs/T3-iso-invoked-1/repo/src/export.js#L2-L4) splits a long line and switches to double quotes. The CSV (comma-separated values) text is the same.
- **Booking list:** [`src/list.js:L3-L5`](file:///tmp/claude-0/-home-user-product-engineer/9a6072d1-b5d0-5abe-abb5-153ce4275008/scratchpad/pe-work-r3/runs/T3-iso-invoked-1/repo/src/list.js#L3-L5) puts the function body on separate lines.
- **Reminder email:** [`src/mail.js:L5-L15`](file:///tmp/claude-0/-home-user-product-engineer/9a6072d1-b5d0-5abe-abb5-153ce4275008/scratchpad/pe-work-r3/runs/T3-iso-invoked-1/repo/src/mail.js#L5-L15) builds the body from a list of lines joined by newlines. The guest sees the same text, with the same blank lines.
- **Tests:** `test/reminders.test.js` switches to double quotes and wraps long lines. The test cases are unchanged.

## How to check

1. **Run the tests:** `node --test`
2. **Check the price:** Run `node -e 'console.log(require("./src/pricing").nightlyTotal(0.29, 1))'`. It prints `0.28` on this branch and should print `0.29`.

The tests do not cover `nightlyTotal`, which is why they pass with the bug in place.
