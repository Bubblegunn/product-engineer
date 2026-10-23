I saved the description in `PR.md`. I didn't run the test suite, and I didn't commit anything.

**One change isn't formatting.** `src/pricing.js` now computes `Math.floor(rate * nights * 100) / 100` instead of `rate * nights`. That cuts every stay total down to the cent, and it's the amount guests are charged. The commit message says "no functional change", which is wrong for this line, and no test covers it. The description flags it near the top, because the account manager will read it. I suggested reverting that line, or keeping it deliberately with a test and `Math.round`. That decision is yours.

The other changes (`export.js`, `list.js`, `mail.js`, the tests and the README) only change layout. The reminder email text stays identical.

I left the pricing line as it is. Tell me if you'd like me to revert it.