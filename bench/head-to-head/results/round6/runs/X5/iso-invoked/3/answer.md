I wrote `SUPPORT_NOTE.md` in the repo root (6 sentences) and left the code alone.

**Dana's commit changes customer prices, even though its title says "no behaviour change":**
- **Standard shipping:** it rises from 4.99 to 5.99.
- **Free shipping:** it now starts above 75 instead of at 50. Orders from 50 up to and including 75 used to ship free and now pay 5.99.
- **Express shipping:** it stays at 12.50.

I can't tell from the code whether these prices are live or intended, so the note tells support to ask Dana. You may want to ask Dana the same thing, and to correct the commit title.