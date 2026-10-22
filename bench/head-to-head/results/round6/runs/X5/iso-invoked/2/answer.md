`SUPPORT_NOTE.md` is written in the repo root. It has 5 sentences plus a title, and I didn't touch the code.

Dana's commit title says "no behaviour change", but the diff shows customer-facing price changes:

- **Standard shipping:** it rises from 4.99 to 5.99.
- **Free shipping:** it used to apply at a subtotal of 50 or more. It now applies only above 75, so a subtotal of exactly 75 pays shipping.
- **Orders from 50 to 75:** they used to ship free and now pay 5.99.
- **Express shipping:** it stays at 12.50.

The test was edited to expect 5.99, so it passes. The commit doesn't say whether the new prices were intended, and the note tells support to ask Dana before calling them a mistake or a new policy. You may want to ask Dana yourself.

The code has no currency, so the note shows plain numbers without a symbol.