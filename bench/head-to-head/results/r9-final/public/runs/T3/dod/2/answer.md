I wrote the PR description to `PR.md`. The commit message says "no functional change", but one line changes behaviour.

**The pricing change:** `src/pricing.js` now returns `Math.floor(rate * nights * 100) / 100` instead of `rate * nights`. Floating-point error can make this undercharge by a cent. For example, a rate of 0.29 over 100 nights gives 28.99 instead of 29.00, and a rate of 110.10 over 3 nights gives 330.29 instead of 330.30. No test covers `nightlyTotal`. Nothing in `src/` or `test/` calls it, but I didn't check for callers outside the repo.

`PR.md` calls this out at the top, and its section for the hotel owner's account manager says guests see no change elsewhere. It recommends reverting that line so the PR stays formatting-only, with any rounding done properly in a separate PR. I did not edit the code.

**Tests:** `npm test` passes (5 passed, 0 failed), but none of those tests exercise the pricing function. I did not run an end-to-end probe or check the other DoD items. `PR.md` says so.