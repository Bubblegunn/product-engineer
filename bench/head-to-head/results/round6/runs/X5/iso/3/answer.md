`SUPPORT_NOTE.md` is written in the repo root. It's six sentences and I didn't touch any code.

Dana's commit message says "no behaviour change", but the diff changes what customers pay:
- **Standard shipping:** goes from $4.99 to $5.99.
- **Free shipping:** used to start at $50 or more. It now applies only above $75, so an order of exactly $75 pays shipping. Orders between $50 and $75 that used to ship free now pay $5.99.
- **Express shipping:** unchanged at $12.50.

The tests were edited to match the new numbers, which suggests Dana changed the prices on purpose. The commit message doesn't say so, though. The note asks support to confirm with Dana, and you may want to ask them too.