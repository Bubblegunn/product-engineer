I saved the PR description to `PR.md`. I didn't run the tests; the existing ones only cover reminders, and nothing covers pricing or export.

The branch is described as "no functional change", but one line isn't formatting. In `src/pricing.js`, `nightlyTotal` went from `rate * nights` to `Math.floor(rate * nights * 100) / 100`. That rounds stay totals down to whole cents, and floating-point error can push some totals one cent lower. The description flags this prominently and says what a guest-facing price change could mean for the owner. It also gives the author two options: split the pricing change into its own commit or PR with tests, or revert it. I suggested `Math.round` over `Math.floor` if the change stays.

The rest of the description covers the formatting-only changes in plain language for the account manager. It also notes that `src/mail.js` still uses single quotes while the other files now use double quotes.

I haven't changed any code, and the commit message still says "no functional change".