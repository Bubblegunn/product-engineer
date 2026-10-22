`SUPPORT_NOTE.md` is written in the repo root. It has 6 sentences, and I didn't touch any code.

Dana's commit message says "no behaviour change", but the diff changes what customers pay:
- **Standard shipping:** $4.99 becomes $5.99.
- **Free shipping:** it used to start at $50 or more. Now it starts only above $75, so an order of exactly $75 pays shipping.
- **Express:** unchanged at $12.50.

Orders between $50 and $75 are hit hardest. They used to ship free and now pay $5.99.

I can't tell from the commit whether Dana meant to change the prices or whether it's a refactor mistake. You may want to ask Dana before the note goes to support. The note says the prices go up and doesn't say whether that was intended.

I haven't committed the file.