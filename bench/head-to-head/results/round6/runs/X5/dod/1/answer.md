`SUPPORT_NOTE.md` is in the repo root and is 5 sentences, plus a heading. I didn't touch any code.

Dana's commit message says "no behaviour change", but the commit does change what customers pay:

- **Standard shipping:** the fee goes from $4.99 to $5.99.
- **Free shipping:** it now starts above $75 instead of at $50. An order of exactly $75 pays shipping, and orders from $50 to $75 that used to ship free now pay $5.99.
- **Express:** unchanged at $12.50.

Dana's test change only updated the $4.99 expectation to $5.99, so the tests don't cover the free-shipping threshold.

The note tells support that these changes exist, and also that we haven't confirmed with Dana whether they were intended. Ask Dana before the note goes out. If the changes were a mistake, fix the code instead, and the note will need rewriting. I couldn't tell from the repo whether this commit has been released.