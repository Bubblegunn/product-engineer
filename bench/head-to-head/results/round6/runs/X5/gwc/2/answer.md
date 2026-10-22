`SUPPORT_NOTE.md` is written in the repo root (6 sentences). I didn't touch any code.

Dana's latest commit (`a9caaad`) says "no behaviour change", but it does change what customers pay:
- **Standard shipping:** it went from $4.99 to $5.99.
- **Free shipping:** it used to start at $50 or more. Now it starts only above $75, so orders from $50 up to and including $75 now pay shipping.
- **Express shipping:** unchanged at $12.50.

I can't tell from the diff whether this was intended. The updated test only covers the $5.99 fee, so it won't catch the threshold change. The note tells support we're confirming with Dana and not to promise refunds yet. If the changes were unintended, the commit message is wrong and the code needs fixing. Once you've talked to Dana, update the last sentence of the note.