I wrote `SUPPORT_NOTE.md` in the repo root. It has 6 sentences, and I didn't touch any code.

**The commit message is wrong.** Dana's commit says "no behaviour change", but it changes what customers pay for shipping:
- **Standard shipping:** goes from $4.99 to $5.99.
- **Free shipping:** now starts above $75, where it used to start at $50. An order of exactly $75 now pays shipping, and orders from $50 to $75 that used to ship free now pay $5.99.
- **Express shipping:** unchanged at $12.50.

Dana may have meant the price changes, or they may be a mistake. The note tells support to confirm with Dana or Dev before they say anything to customers. I haven't checked whether this change has been released.