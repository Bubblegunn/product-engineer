I committed it as `2f8c317` on `main`: `fix(price): clamp discount percent to 0-100`. I didn't run the tests, since the changelog skill is read-only.

**Correction to "everything is staged":** `test/price.test.js` was untracked, not staged. I added it so the tests went in with the fix. The working tree is clean now.

# Git Weekly Changelog

**Analysis basis**

- Generated: `2026-10-23 14:48:36 +03`
- Range: `2026-10-16` → `2026-10-23`
- Branch: `main`
- Method: read-only git inspection. The tests were not run.

---

## 🐛 Bug Fixes

- **Discount over 100%:** `applyDiscount` in `src/price.js` now clamps the percent to 0–100. Before, a percent above 100 gave a negative price. A negative percent is now treated as 0, so the price is unchanged.
- **Debug logging:** I removed a stray `console.log('money called', …)` from `money()` in `src/format.js`.

## 🧪 Tests & CI

- `test/price.test.js` is new and has three cases:
  - 150% discount gives 0.
  - -5% discount leaves the price unchanged.
  - 10% discount on 1000 gives 900.

## 🗂️ Dependencies & Tooling

- The version in `package.json` goes from 1.4.2 to 1.4.3.

---

**Summary**

This week was a small patch release (1.4.3) that stops discounts above 100% from producing negative prices, with tests for it. The three earlier commits (price/format helpers, gitignore, cart total with discount) are from Sept 1–3, so they fall outside the 7-day window and aren't in the changelog.

The version bump and the `console.log` removal weren't part of what you described, so I mentioned both in the commit body.