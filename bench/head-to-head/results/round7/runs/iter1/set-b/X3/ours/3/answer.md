I rewrote `docs/late-fees.md` in plain language and committed it (`2a3d366`, amended once to fix a typo in the commit message).

**Rule check.** Every rule is unchanged: 21 and 7 days, two renewals only if no other patron has a hold, the 3-day grace period (not for DVDs), $0.25 and $1.00 per day, the $10.00 cap, the $5.00 suspension and its lift, the under-12 exemption, and billing as lost at 60 days. `product-engineer facts` reported no numbers added or dropped and no sentence without a source counterpart. Average sentence length is 10.4 words, and the longest is 20. I did not check the wording against the original by anyone other than myself.

**Tests.** `npm test` ran 3 tests, 3 passed, 0 failed. They cover `src/fees.js` only, not the doc.

**Code and doc disagree on grace days.** `src/fees.js:1` has `GRACE_DAYS = 2`, but the doc says 3. You told me nothing may change, so I kept 3. Staff will quote 3 to patrons, while the code charges from day 3, so the doc and the code can't both be right. Someone needs to say which side is correct. No test covers the grace period for books.

I made no code changes. The working tree was clean after the commit (`git status --short` printed nothing).