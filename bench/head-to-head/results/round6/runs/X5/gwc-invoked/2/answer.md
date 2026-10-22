`SUPPORT_NOTE.md` is written in the repo root. It has 6 sentences, and I didn't touch any code.

Dana's commit message says "no behaviour change", but the diff changes what customers pay:
- **Standard shipping:** it goes from $4.99 to $5.99.
- **Free shipping:** the threshold goes from $50 or more to over $75. Orders from $50 to $75, including exactly $75, used to ship free and now pay $5.99.
- **Express shipping:** it stays at $12.50.

Dana also edited the test to expect 5.99, so the price change looks deliberate. The "no behaviour change" label is wrong, though. You may want to ask Dana whether the new fee and threshold were intended.

I only read the git history. I didn't run the tests, and I couldn't tell whether the change has been released to customers. The note says both of those things.