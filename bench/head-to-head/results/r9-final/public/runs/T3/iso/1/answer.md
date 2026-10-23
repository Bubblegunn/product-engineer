I saved the pull request description in `PR.md`. I wrote it so the hotel owner's account manager can follow it too. I didn't run the tests. I checked by reading the full diff against `main`.

The branch is meant to be formatting only, and its commit message says "no functional change". That isn't true for one line. In `src/pricing.js`, stay totals now round down to whole cents. A rate of 33.333 for 3 nights used to total 99.999 and now totals 99.99. Hotels with rates that have more than two decimal places would see different totals.

`PR.md` puts this first, as a decision needed before merging. It suggests either removing that line or moving it into its own pull request. I didn't change any code.

The rest of the diff is layout only. The reminder email text and the CSV export output are identical.