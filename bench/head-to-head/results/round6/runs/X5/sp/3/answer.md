I wrote `SUPPORT_NOTE.md` in the repo root. It has 6 sentences, plus a title line, and I didn't touch any code.

**Dana's commit changes shipping prices.** The title says "no behaviour change", but the diff changes what customers pay:
- **Standard shipping:** $4.99 becomes $5.99.
- **Free-shipping threshold:** it moves from $50 to $75. The check also changes from "$50 or more" to "over $75", so an order of exactly $75 now pays shipping.
- **Express shipping:** unchanged at $12.50.

Dana also edited the standard-shipping test to expect 5.99, so the price change looks deliberate rather than a typo. I can't tell whether it was meant to ship under a "refactor" title. The note tells support to confirm with Dana before calling the new prices final.

I haven't checked whether this commit is deployed. The note says the new prices apply "once this change is live", so support will need to know the release status.