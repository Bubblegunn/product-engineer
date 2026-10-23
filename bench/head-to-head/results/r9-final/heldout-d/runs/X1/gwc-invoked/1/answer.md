I committed it as `b393beb`, `fix(price): clamp discount percent to 0-100`. The working tree is clean. I did not run the tests.

One correction to "everything is staged": `test/price.test.js` was still untracked, so I staged it before committing. The other three files were already staged.

# Changelog for this commit

**Analysis basis:** generated 2026-10-23 14:48 +03, branch `main`, from read-only git inspection. This is a single commit, so I didn't use the weekly window.

## 🐛 Bug fixes
- **Discount clamping:** `applyDiscount` in `src/price.js` now limits the percent to 0–100. Before, a discount over 100% gave a negative price, and a negative discount raised the price.

## 🧪 Tests
- New `test/price.test.js` has three cases:
  - A 150% discount gives 0.
  - A -5% discount leaves the price at 1000.
  - A 10% discount on 1000 gives 900.

## 🔧 Housekeeping (not in your description)
- Removed a leftover debug `console.log('money called', …)` from `money()` in `src/format.js`.
- Bumped the version in `package.json` from 1.4.2 to 1.4.3.

I put the log removal and the version bump in the commit body so they don't go unmentioned. If you'd rather have them as separate commits, I can split them out.