I saved the PR description to `PR.md`. The branch's commit says "no functional change", but one line does change behavior. The description says so openly, and the account manager will see it.

- **Formatting:** the other changes are layout only. They touch the README, CSV export, list, mail and the reminder tests. The email text and CSV output are the same as before.
- **Behavior change:** `src/pricing.js` now rounds the stay total down to whole cents, which is a functional change.
  - It can make a total one cent too low. For example, `nightlyTotal(0.29, 100)` returns 28.99 instead of 29.00.
  - Nothing in this repo calls the function, so I couldn't tell whether guest prices or invoices use it.
- **Recommendation in the PR:** revert that one line to `rate * nights`. If cent rounding is wanted, do it in a separate change that uses `Math.round` and has tests.
- **Tests:** `node --test` passes, 5 of 5. No test covers `nightlyTotal`, so none would have caught this.

I didn't change any code. I didn't run `/dod:verify`, since I only wrote a description file.