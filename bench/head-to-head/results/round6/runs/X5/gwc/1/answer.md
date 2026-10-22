`SUPPORT_NOTE.md` is written in the repo root, and I didn't touch any code or commit anything.

Dana's commit message says "no behaviour change", but the diff does change what customers pay:

- **Standard shipping:** the fee goes from $4.99 to $5.99.
- **Free shipping:** it now applies only to orders over $75. Before, it applied at $50 or more. Orders from $50 to $75, and orders of exactly $75, now pay $5.99.
- **Express shipping:** it stays at $12.50.

I can't tell whether Dana meant to change the prices. The note says the new prices are correct for this change but that the commit message doesn't mention them. Ask Dana if the $5.99 fee and the $75 threshold were intentional. If they weren't, the code needs fixing.