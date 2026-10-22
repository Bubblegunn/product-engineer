Wrote `SUPPORT_NOTE.md` in the repo root, 6 sentences in plain language. I didn't touch the code.

**Dana's commit message is wrong.** It says "no behaviour change", but the commit changes what customers pay:
- **Standard shipping:** 4.99 became 5.99.
- **Free shipping:** it used to apply at a subtotal of 50 or more. It now applies only above 75, so exactly 75 pays shipping. Orders between 50 and 75 used to ship free and now pay 5.99.
- **Express:** unchanged at 12.50.

The note says this directly. It also tells support to check with Dana before calling the change deliberate. It's still possible the new numbers were intended, but the "refactor" label hides them either way. The tests were edited to match the new 5.99 price, so they pass and don't flag it.

I left out currency symbols because the code doesn't say which currency applies.