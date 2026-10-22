I wrote `SUPPORT_NOTE.md` in the repo root. It is 6 sentences, and `git status` shows it is the only change, so the code is untouched.

**The commit message is wrong.** Dana's commit says "no behaviour change", but I ran the old and new code side by side and customers will see different prices:
- **Standard shipping:** the fee went from $4.99 to $5.99.
- **Free-shipping threshold:** free shipping used to start at $50 and now only applies above $75. An order of $50 to $75, including exactly $75, now pays $5.99 instead of $0.
- **Express:** unchanged at $12.50.

The 3 existing tests pass, but Dana changed the standard-fee test from 4.99 to 5.99 to match. The tests don't cover the $50 to $75 range.

I can't tell from the repo whether these price changes were intended. The note says so and asks support to confirm with Dana or the product owner before telling customers it's the new policy. You may want to ask Dana the same thing.