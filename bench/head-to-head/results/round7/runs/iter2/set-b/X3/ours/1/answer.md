`docs/late-fees.md` is rewritten in plain language and committed as `4057cc9`. Every rule and number is unchanged.

**Correction:** my earlier test run happened before my last two edits to the doc. I have now re-run it after the commit. `npm test` printed `ℹ tests 3`, `ℹ pass 3`, `ℹ fail 0`, `ℹ skipped 0`. `git status --short` printed nothing, so the working tree is clean. The tests only exercise `src/fees.js`, not the doc. This run shows the code tests still pass, not that the doc is correct.

**The doc and the code disagree on the grace period.** The doc says 3 days. `src/fees.js:1` has `GRACE_DAYS = 2`. You told me not to change what the doc asks of people, so I kept 3. Someone needs to decide which is right. I haven't touched the code. Until then, staff will quote 3 days while the system charges after 2.

**What I did**
- I rewrote the doc with short sentences. One rewrite sentence maps to each source sentence. I added no new sections and no defined terms. I kept "grace period", "hold" and "patron" from the source.
- I committed it with a "For the customer" block in English and a Turkish "Sade dil" block, per your global instructions.

**What I checked**
- `product-engineer facts` compared the original with the final rewrite. All 10 numbers match: 21, 7, 3, 0.25, 1, 10, 5, 5, 12, 60. None were dropped or added.
- The same command reported 13 sentences averaging 11.2 words, the longest at 20.
- It flagged one sentence as having no counterpart in the source: the renewal sentence ("You can renew an item two times…"). I checked that by hand, and it paraphrases the source's "renewed twice, as long as no other patron has placed a hold."

**What I did not check**
- The 3 tests cover the under-12 exemption, the $10 cap and no grace for DVDs. They don't cover the grace-period length, the renewal limit or the $5 suspension rule.
- The 21/7-day loan lengths, the 2-renewal limit, the $5 suspension and the 60-day lost rule don't appear in `src/`, so I couldn't compare them to code.
- I did not read the rewrite aloud to a real 10-year-old.