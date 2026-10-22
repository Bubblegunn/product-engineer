Wrote `SUPPORT_NOTE.md` in the repo root. It has 6 sentences, and I didn't touch any code.

Dana's commit title says "no behaviour change", but the diff changes what customers pay:
- **Standard shipping:** $4.99 becomes $5.99.
- **Free shipping:** it now starts above $75 instead of at $50. Orders from $50 to $75 used to ship free and now pay $5.99. An order of exactly $75 also pays, because it must be over $75.
- **Express shipping:** unchanged at $12.50.

The note describes the actual price changes, not the commit title. Check with Dana whether the increase was intended. If it was only meant as a refactor, the old values need restoring.