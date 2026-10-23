I saved the PR description in `PR.md`. I only read the diff and ran the pricing examples in Node, so I didn't run the test suite.

**One change is not formatting.** `src/pricing.js` now returns `Math.floor(rate * nights * 100) / 100` instead of `rate * nights`. That cuts totals off at whole cents instead of rounding them, so some totals come out a cent low. For example, 29.99 × 7 gives 209.92 instead of 209.93. The commit message says "no functional change", which is wrong for this file.

Nothing else in the repo calls `nightlyTotal`, and no test covers it. If the app that uses stayhub calls it for guest prices or invoices, those amounts could be a cent too low.

I put this at the top of the description as a decision for the reviewer, in plain language for the account manager. My recommendation there is to revert that line before merging. If rounding to cents is wanted, it should be a separate change that uses `Math.round`, has tests, and is agreed with the hotel owner.

The rest is listed as formatting only. In `src/mail.js` I checked by reading that the reminder email text is identical. The mixed quote styles are noted as harmless.

I haven't changed the code or the commit message. Reverting the pricing line is yours to approve.