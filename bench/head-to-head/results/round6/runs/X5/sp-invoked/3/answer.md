I wrote `SUPPORT_NOTE.md` in the repo root. It has 6 sentences, and I didn't touch any code.

Dana's commit says "no behaviour change", but it does change what customers pay. I ran the old and new `shippingCost` side by side to check:

- **Standard shipping:** it went from $4.99 to $5.99.
- **Free shipping threshold:** it moved from $50 or more to strictly over $75. Orders from $50 to $75 used to ship free and now pay $5.99. An order of exactly $75 also pays.
- **Express shipping:** unchanged at $12.50.

Dana also edited the test to expect $5.99, so the tests pass (3 of 3). They don't cover the free-shipping threshold, so that change wasn't caught.

The note tells support that customers may complain and would be right to. It also says the new prices need confirming with Dana or the product owner, since the commit message doesn't mention them. You may want to ask Dana whether the changes were intended.