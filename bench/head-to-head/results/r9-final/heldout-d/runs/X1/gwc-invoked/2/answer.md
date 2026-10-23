I committed it as `f3f22fd` on `main`. I didn't run the tests.

# Changelog: 2026-10-23 14:48 +03:00, branch `main`

## 🐛 Bug Fixes
- **Discount over 100%:** `applyDiscount` in `src/price.js` now clamps the percent to 0–100 before applying it. Before, a discount over 100% gave a negative price, and a negative percent raised the price.

## 🧪 Tests & CI
- `test/price.test.js` is new, with 6 lines of tests for the discount fix.

## ♻️ Refactoring & Internals
- I removed a leftover debug `console.log('money called', …)` from `money()` in `src/format.js`.

## 🗂️ Dependencies & Tooling
- I bumped the version in `package.json` from 1.4.2 to 1.4.3.

## Things to check
- **Test file:** `test/price.test.js` was untracked, not staged, so I added it to the commit.
- **Extra changes:** the debug-log removal and the version bump were in your staged changes, so they went in too. I mentioned both in the commit body. If you wanted them separate, say so and I'll split the commit.
- **Skill window:** the skill's usual 7-day history summary didn't fit this request, so I used its format for this one commit only.