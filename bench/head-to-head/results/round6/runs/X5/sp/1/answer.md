`SUPPORT_NOTE.md` is written in the repo root. It is 5 sentences, and I didn't touch any code.

Dana's commit message says "no behaviour change", but the diff changes shipping prices:

- **Standard shipping:** goes from $4.99 to $5.99.
- **Free-shipping threshold:** it moves from a $50 subtotal or more to above $75. Orders from $50 to $75 that used to ship free now pay $5.99, and an order of exactly $75 also pays.
- **Express shipping:** unchanged at $12.50.

The test file was edited to expect $5.99, so the change looks deliberate, but the message doesn't say so. The note tells support to expect complaints and to confirm with Dana or engineering whether the change was intended and whether it is live yet. I couldn't tell from the repo whether it has been released.

I haven't committed the note.