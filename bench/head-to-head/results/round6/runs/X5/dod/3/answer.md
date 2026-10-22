`SUPPORT_NOTE.md` is written in the repo root. It has 6 sentences, plus a heading. I didn't touch any code.

Dana's commit is titled "no behaviour change", but it does change what customers pay. The note says so, because support would otherwise tell customers nothing changed.

- **Standard shipping:** goes up from $4.99 to $5.99.
- **Free shipping:** now starts above $75 instead of at $50. Orders from $50 to $75 now pay shipping, and so does an order of exactly $75.
- **Express shipping:** unchanged at $12.50.

I didn't run the tests. I read the diff, which also changes the test to expect 5.99. I couldn't tell whether the change is live on the site yet, so the note tells support to check with engineering.

You may want to ask Dana whether the changes were intended. The commit message suggests they weren't.