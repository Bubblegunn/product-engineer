Wrote `SUPPORT_NOTE.md` in the repo root. It has 6 sentences. I didn't touch any code.

Dana's commit is labelled "no behaviour change", but it does change what customers pay:
- **Standard shipping:** rises from $4.99 to $5.99.
- **Free shipping:** now starts above $75 instead of at $50. Orders from $50 to $75 used to ship free and now pay $5.99. An order of exactly $75 also pays.
- **Express shipping:** unchanged at $12.50.

Dana also updated the test to expect $5.99, which suggests the fee change may be deliberate. The commit message doesn't say so. The note tells support to confirm with Dana or the product owner before calling these changes permanent.