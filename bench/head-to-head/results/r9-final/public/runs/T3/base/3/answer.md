I saved the description to `PR.md`. I only read the diff and didn't run the tests.

The branch isn't purely formatting, even though the commit says "no functional change". `src/pricing.js` now truncates stay totals to whole cents, using `Math.floor(rate * nights * 100) / 100`. The change appears to be unintended, and the account manager will read this, so I put it at the top of the description.

- **Effect:** totals can drop by up to a cent. Floating-point error could also make some totals one cent low. For example, `1.15 * 100` evaluates to `114.99999999999999`, so a total that should be 1.15 would become 1.14.
- **Tests:** no test covers pricing.
- **Decision for you:** either keep the change and confirm with the hotel that rounding down is intended, or revert it so this PR is formatting only. I didn't touch the code. If you revert it, update the "Behaviour change" section of `PR.md` to match.

The other five files are formatting only. The reminder email text and the CSV output are unchanged.