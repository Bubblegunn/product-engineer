I committed the staged change as `e08df76`, but the draft message in `.draft-message.txt` was wrong, so I didn't use it. That draft said "No behaviour change. Adds tests." The staged code does change behaviour, and it adds no tests.

- **The change:** `hasVisitsLeft` in `src/pickup.js` uses `>` where the old code used `>=`. A household with 2 visits this month can now book a third. The old rule stopped them at 2.
- **Tests:** `npm test` passed (3 passed, 0 failed), but none of the tests cover a household with 2 visits, so they don't catch this.
- **The message:** It says plainly that the limit changed. The "For the customer" block tells the coordinator to approve only if three visits is the new rule.

Decision for you: I think the `>` is a typo, because the `MAX_VISITS_PER_MONTH = 2` constant is unchanged. Say so and I'll change it back to `>=`, add a test for the 2-visit case, and amend the commit. `.draft-message.txt` is still untracked, and I left it alone.