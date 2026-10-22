`SUPPORT_NOTE.md` is written in the repo root, in 6 sentences. I changed no code and ran no tests. I only read the diff.

Dana's commit (a9caaad) says "no behaviour change", but the diff changes shipping prices:
- **Standard shipping:** goes from 4.99 to 5.99.
- **Free shipping threshold:** moves from 50 to 75. Orders between 50 and 75 used to ship free and now pay 5.99.
- **Orders of exactly 75:** now pay shipping, because free shipping needs strictly more than 75.
- **Express shipping:** unchanged at 12.50.

Dana also edited the test to expect 5.99, so the change looks deliberate. It doesn't match the commit message, though, so ask Dana whether the new prices are intended. The note tells support the same thing.