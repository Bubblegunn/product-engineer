`SUPPORT_NOTE.md` is written in the repo root. It has 4 sentences, under your limit of 6. I didn't change any code.

**What the latest commit does for customers.** Dana's commit is titled "no behaviour change", but it does change what customers pay:
- Standard shipping goes from 4.99 to 5.99.
- Free standard shipping used to start at an order total of 50 and now starts above 75. An order of exactly 75 now pays shipping.
- Express shipping is unchanged at a flat 12.5.

Dana also changed the test to expect 5.99. That makes the change look deliberate, but I can't confirm it. I'd ask Dana or the product owner whether the new prices are intended before support tells customers anything. If they aren't intended, the commit should be reverted.

**Claim check.** I ran `product-engineer facts` on the commit diff and the note. The first run flagged three sentences that weren't in the commit: the heading, a line about customers asking questions, and a line telling support not to call it a mistake. I removed all three, so the note only states what the commit shows. The advice about asking Dana is in this reply instead.

The check still reports `fail`, but only because it lists the diff's own numbers as "dropped". Those are commit hashes, dates, line counts and file modes that don't belong in a note for support. It no longer reports any added numbers or unsupported sentences. The longest sentence is 35 words, exactly at the tool's limit.