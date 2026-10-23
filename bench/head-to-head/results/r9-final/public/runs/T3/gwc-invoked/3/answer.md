I saved the PR description to `PR.md`. I haven't run the tests.

The commit says "no functional change", but that isn't true for `src/pricing.js`. It now returns `Math.floor(rate * nights * 100) / 100` instead of `rate * nights`. That cuts totals off at two decimals, so some stays come out one cent lower. For example, 89.99 × 3 was 269.97 and is now 269.96. No test in the branch covers this.

I put this at the top of the description as a decision to make before merging: either split it into a separate PR with a proper rounding rule, or confirm it's intended. A short section at the end, written for the hotel owner's account manager, says reminder emails and CSV exports are unaffected and the cent risk is the only customer-visible one.

Every other change is formatting only. I checked with `git diff -w main..HEAD`. The rebuilt reminder email text comes out identical.

I didn't change the code itself or revert the pricing line.