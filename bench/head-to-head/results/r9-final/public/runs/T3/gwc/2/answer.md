I saved the PR description to `PR.md`. The "format the code, no functional change" commit contains one change that does affect behavior, and the description says so.

**Pricing change:** in `src/pricing.js`, `nightlyTotal` went from `rate * nights` to `Math.floor(rate * nights * 100) / 100`. Stay totals are now rounded down to the cent, and floating-point error can shift a total by a cent in some cases. No test covers this, and the commit message doesn't mention it. The description tells the reader to either split it into its own PR with tests or revert that line before merge.

**What the description covers:**
- **Formatting changes:** the other edits are formatting only. I checked that the reminder email text and the CSV export output come out identical.
- **Audience:** I wrote it so the hotel owner's account manager can follow it. It has a short section saying guest emails and the CSV export are unchanged, and that the stay total is the one thing to confirm.
- **Testing:** I only read the diff and did not run the test suite. The description says so.

I didn't change any code. Whether to keep or revert the rounding is your call.