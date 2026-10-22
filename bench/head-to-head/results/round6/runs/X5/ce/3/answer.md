I wrote `SUPPORT_NOTE.md` in the repo root (6 sentences) and didn't touch any code.

Dana's commit is titled "no behaviour change", but it does change what customers pay:
- **Standard shipping:** it went from $4.99 to $5.99.
- **Free shipping threshold:** it moved from orders of $50 or more to orders over $75, so an order of exactly $75 now pays.
- **Express shipping:** it stays at $12.50.

Orders between $50 and $75 used to ship free and now pay $5.99, which is the case support is most likely to hear about. The note tells support to check with Dana before presenting this as the new policy. The tests were edited to match the new $5.99 fee, so they pass and wouldn't have flagged any of this.

I'd ask Dana whether the change was intended. If it wasn't, the old values need restoring.