`SUPPORT_NOTE.md` is written in the repo root. It is 6 sentences plus a heading, and I didn't touch the code.

Dana's commit is labeled "no behaviour change", but it does change what customers pay:
- **Standard shipping:** the fee for smaller orders rises from $4.99 to $5.99.
- **Free shipping:** the threshold moves from $50 or more to strictly over $75. An order of exactly $75 now pays the fee, and orders between $50 and $75 that used to ship free now pay $5.99.
- **Express:** unchanged at a flat $12.50.

Dana may have intended these changes, but the label doesn't say so. Check with them before sending the note to support. If the changes were unintended, they are a bug to fix rather than something to explain to customers.