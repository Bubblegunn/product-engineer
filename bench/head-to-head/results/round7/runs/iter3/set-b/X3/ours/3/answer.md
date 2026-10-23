I rewrote `docs/late-fees.md` in plain sentences and committed it as `52eb38b`. The doc and the code disagree on the grace period, and I left that unresolved.

**Doc and code disagree on the grace period.** The doc says 3 days. `src/fees.js` sets `GRACE_DAYS = 2`. I kept 3 in the rewrite, because you said nothing may change in what it asks of people. Staff will quote 3 days while the code charges after 2 for books. Someone needs to decide which value is right.

**What I checked**
- **Numbers and rules:** `product-engineer facts` compared the old and new text. It reported no numbers dropped or added, no obligations lost and no sentences without a source. Average sentence length is 9.0 words and the longest is 18.
- **Other values:** I grepped the code for the rest. The $0.25 and $1.00 rates, the $10.00 cap, no grace for DVDs and the under-12 exemption all match `src/fees.js`.
- **Tests:** `node --test` ran 3 tests and all passed. None covers the book grace period, so that result says nothing about the 2-versus-3 question.
- **Commit:** I ran `git status` before committing. Only `docs/late-fees.md` was modified, and nothing is left uncommitted.

**What I could not check.** The code has no renewal, hold, $5.00 suspension or 60-day lost-item logic. I found no code to compare against those rules, so I did not verify them.

**One difference to be aware of.** The code compares `cardAge < 12`. The doc says "cards issued to patrons under 12". These may not mean the same thing. I kept the doc's wording.

The commit message includes a plain-language "For the customer" block.