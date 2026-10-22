I wrote `SUPPORT_NOTE.md` in the repo root. It has 6 sentences and I didn't touch any code.

Dana's commit title says "no behaviour change", but the diff changes what customers pay:

- **Standard shipping price:** it goes from 4.99 to 5.99.
- **Free shipping threshold:** it moves from orders of 50 or more to orders over 75. Customers with orders from 50 up to and including 75 used to ship free and now pay 5.99.
- **Express shipping:** it stays at 12.50.

Dana also edited the standard-shipping test from 4.99 to 5.99, so the tests still pass. I couldn't tell from the repo whether this was deliberate or whether it has been released, so the note tells support to ask Dana. You may want to check with them before sending it.