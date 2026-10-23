I saved the pull request description in `PR.md`. The branch has one commit, "format the code, no functional change". That message isn't true for one line, and the description says so.

**The problem.** [`src/pricing.js`](src/pricing.js) now returns `Math.floor(rate * nights * 100) / 100` instead of `rate * nights`. This cuts every stay total down to whole cents. A total can come out one cent too low: a rate of 0.29 for 100 nights gives 28.99 instead of 29.00. The account manager will read this, so I put the price effect near the top, with a small example table.

**What I didn't do.** I left the code as it is, because I don't know whether you meant the rounding. `PR.md` asks for a decision. You can use `Math.round` with a test, or revert that line and ship the rounding separately.

**Other files.** I compared the other five files and found no behaviour changes. That includes `reminderBody`, which builds the same email text. I did not run the test suite.

You may also want to change the commit message, since "no functional change" is wrong.