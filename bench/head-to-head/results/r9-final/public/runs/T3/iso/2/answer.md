I saved the PR description in `PR.md`. The branch has one problem you should know about before you merge it.

The commit is labelled "style: format the code, no functional change", but `src/pricing.js` does change behaviour. `nightlyTotal` used to return `rate * nights`. It now rounds the total down to the cent. In a quick check, 0.29 × 1 night gives 0.28 where it used to give 0.29. Totals that already have two decimals, like 100.00 × 2 nights, don't change. No test covers this.

The description says this openly, since the account manager will read it. It lists the other changes as formatting only and asks for a decision: keep the rounding and add a test, or restore `return rate * nights;`. I recommended restoring it unless the rounding was intended. I didn't change any code.

I didn't run the test suite. I only read the diff and ran the one rounding calculation.