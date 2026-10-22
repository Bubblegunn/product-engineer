I wrote `SUPPORT_NOTE.md` in the repo root and left the code alone. The note is 6 sentences.

Dana's commit says "no behaviour change", but the diff shows customers will pay more for shipping:
- **Standard shipping:** it went from 4.99 to 5.99.
- **Free shipping:** it used to start at an order total of 50 and now only applies to orders over 75. Orders from 50 up to and including 75 used to ship free and now pay 5.99.
- **Express shipping:** it is unchanged at 12.50.

Dana also changed the test to expect 5.99, so the change looks deliberate. The commit message doesn't mention it, though. Ask Dana whether the price increase was intended, because the note tells support to confirm that.

I didn't run `/dod:verify` or the tests. The only file I added is the note, and I didn't touch any code.