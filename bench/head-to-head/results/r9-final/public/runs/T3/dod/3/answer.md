I saved the PR description to `PR.md`. The commit says "no functional change", but one line in it does change behavior.

`nightlyTotal` in `src/pricing.js` now does `Math.floor(rate * nights * 100) / 100`, which can under-charge by a cent because of floating-point error:

| rate | nights | result |
|---|---|---|
| 19.99 | 1 | 19.98 |
| 1.15 | 1 | 1.14 |
| 0.29 | 1 | 0.28 |

Nothing in the code calls `nightlyTotal` yet, and no test covers it, so nothing is wrong today. `PR.md` flags this clearly, since the account manager will read it. It recommends reverting that line and doing cent rounding in a separate PR once the hotel says which rule it wants.

The other five files are formatting only. In `src/mail.js` I confirmed by reading the diff that the email text is identical. `npm test` passes (5 of 5), but none of those tests cover pricing.

I didn't change any code. The `pricing.js` line is still in the branch, so revert it, or tell me to, before merging.