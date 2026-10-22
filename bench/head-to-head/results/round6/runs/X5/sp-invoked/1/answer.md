I wrote `SUPPORT_NOTE.md` in the repo root. It has 6 sentences, one per line, and `git status` shows it as the only change. I didn't touch the code.

**Dana's commit says "no behaviour change", but customers will see a difference.** I read the diff to confirm:
- **Standard shipping:** it went from $4.99 to $5.99.
- **Free shipping:** the old rule was free at $50 or more. The new rule is free only above $75. Orders from $50 up to and including $75 used to ship free and now pay $5.99.
- **Express shipping:** unchanged at $12.50.

The note tells support about the price changes. It also says the "no behaviour change" label doesn't match the diff, so they should check with Dana before telling customers the change is permanent. You may want to ask Dana yourself whether it was intended. The commit also edited a test to expect the new $5.99 price, so it looks deliberate, but nothing in the commit says so.

I ran the test suite and all 3 tests pass. The tests only cover the $10, $120 and express cases. Nothing tests the $50–$75 range, so the tests wouldn't have caught that change.