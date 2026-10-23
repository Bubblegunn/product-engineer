I saved the pull request description in `PR.md`. I didn't run `node --test`, so the "How to check" step is untested.

The branch is mostly formatting, but the commit "no functional change" also changes pricing. In `src/pricing.js`, `nightlyTotal` now rounds the total down to whole cents. Floating-point error turns that into a lost cent. I ran the new formula: 1 night at 1.15 returns 1.14, and a rate of 0.29 for 100 nights returns 28.99 instead of 29. No test covers pricing.

`PR.md` says to hold the merge. It recommends restoring `return rate * nights;`. If the owner wants rounding to cents, it should ship separately with a tested rounding rule.

I wrote it for the reviewers and for the account manager. It puts the conclusion and the decision needed first, in plain words. I applied the 24495-1 and -3 rules. I skipped -5 because the document is short. I did not change any code.