`SUPPORT_NOTE.md` is written in the repo root. I didn't touch any code or commit anything.

Dana's commit message says "no behaviour change", but the diff changes prices customers pay:
- **Standard fee:** up from $4.99 to $5.99.
- **Free shipping threshold:** moved from orders of $50 or more to orders over $75. An order of exactly $75 now pays the fee.
- **Express:** unchanged at $12.50.

The note says the prices changed and gives these numbers. It is 6 sentences, not counting the title.

You may want to ask Dana whether the threshold and fee changes were intended. The commit says it was a pure refactor, and the test was updated to the new $5.99 price. That could mean the change was deliberate and mislabeled, or that it slipped in by accident.