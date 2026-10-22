Commit `fdfec46` is on `main`: `feat(discount): add SPRING15 code and make codes case-insensitive`. I did not push.

- **Tests:** `test/discount.test.js` was modified but not staged, so I staged it to go in with the code. All 4 tests pass when run on that file. `npm test` (`node --test`) wasn't run. Passing the `test/` directory to `node --test` failed, so I ran the file directly.
- **Case-insensitivity:** Your diff also made all codes case-insensitive, not only SPRING15. I put that in the message body because it changes `WELCOME10` and `VIP20` too.
- **Expiry:** The message says there is no expiry handling. Your `scratch.log` note says to ask Priya about expiry dates, so that's still open.
- **`scratch.log`:** Left untracked and out of the commit.
- **Message format:** I added the plain-language Turkish section from your CLAUDE.md, and left out the automation-impact line because this change doesn't reduce manual work.