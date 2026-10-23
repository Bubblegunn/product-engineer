I wrote the pull request description in `PR.md`. I re-ran the tests after my last edit to it. `npm test` printed `tests 5`, `pass 5`, `fail 0`. My earlier test claim was made before that run.

**The commit message is wrong.** The commit says "no functional change", but `src/pricing.js` changed behaviour. `nightlyTotal` used to return rate × nights unchanged. It now cuts the total down to two decimals (`Math.floor(rate * nights * 100) / 100`). Because of how computers store decimals, some totals may come out one cent lower than expected. For example, 0.29 × 100 is stored as 28.999…, which cuts down to 28 cents. I haven't tested this, and no test covers pricing.

**What `PR.md` says**
- It opens with the plain-language "For the customer" block, so the hotel owner's account manager reads it first. That block flags the rounding change.
- It then goes through each file. I compared the changes in `src/mail.js`, `src/export.js`, `src/list.js`, the test file and the README by reading the diff. They look like layout changes only. I didn't open a real email, export file or booking list.
- It states what I checked and what I didn't, and it asks one open question about the pricing change.

**Decision for you:** either move the pricing change to its own commit with a test, or keep it and confirm that cutting totals down is wanted. I left the branch alone.