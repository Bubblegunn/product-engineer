I wrote the PR description to `PR.md`. I didn't run the tests.

The commit is titled "no functional change", but one edit in it does change behavior. In `src/pricing.js`, `nightlyTotal` used to return `rate * nights`. It now rounds the total down to whole cents. Stay totals that aren't already whole cents can come out up to 1 cent lower, and floating-point error can also take 1 cent off an otherwise exact total. That change has no test coverage.

I put this at the top of `PR.md` in plain language, since the hotel owner's account manager will read it. It recommends reverting `src/pricing.js` unless the rounding is intended. If it is intended, it should be a separate change that the account manager can confirm with the hotel owner.

The rest of the diff is formatting only. That covers the CSV export, the booking list, the reminder email, the reminder tests and the README. The text guests receive in the reminder email is unchanged.

I haven't changed any code. Reverting `src/pricing.js` is up to you.