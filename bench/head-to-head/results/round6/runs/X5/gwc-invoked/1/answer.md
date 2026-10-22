`SUPPORT_NOTE.md` is written in the repo root. It has 6 sentences, and I changed no code. I only read the git history and ran no tests.

**Dana's commit changes prices, despite its title.** The title says "no behaviour change", but the diff shows three changes:
- Standard shipping goes from $4.99 to $5.99.
- Free shipping used to start at $50 and now starts above $75. An order of exactly $75 now pays shipping.
- Orders between $50 and $75 used to ship free and now pay $5.99.

Express shipping is unchanged at $12.50.

Dana also edited the test to expect $5.99, so the test suite will pass and hide the change. Ask Dana whether the new prices were intended. If they weren't, the constants need fixing. The note tells support to check this too.