Commit `09d76b6` is made on `main`. I didn't push anything.

- **Message:** it says what changed: the SPRING15 code at 15% off, and codes now matching regardless of case. I also noted that case-insensitivity applies to WELCOME10 and VIP20, since that changes existing behaviour. The body lists the two new tests. It ends with a "For the customer" block.
- **Tests:** `npm test` gave 4 passed, 0 failed. I didn't run the checkout flow or UI.
- **Staging:** only `src/discount.js` was staged. Your test changes were unstaged, so I added `test/discount.test.js` to the commit.
- **Left out:** `scratch.log` is still untracked. It holds a personal note about asking Priya for the expiry dates, and expiry isn't implemented, so I said so in the message.