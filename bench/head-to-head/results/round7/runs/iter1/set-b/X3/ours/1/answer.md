I rewrote `docs/late-fees.md` in place and committed it as `c452bf5`.

- **Layout:** The page now has short sentences under small headings: loan length, grace period, fee amount, when you cannot borrow, and two special rules.
- **Rules:** I compared the new text with the original by reading both, and every number and condition matches. That comparison is the only evidence that the rules are unchanged. The tests don't read the doc.
- **Tests:** I ran `npm test` (`node --test`) after the edit: 3 passed, 0 failed. The tests are "child cards pay nothing", "fee is capped at 10" and "dvds have no grace days". They check the fee code in `src/`, not this page. The run shows the code still behaves as before, which I did not change. No test covers the wording of the page.
- **Not covered by any check:** Whether the page is easy for a 10-year-old to follow. I did not test that with a reader.
- **Wording I added:** "An item is overdue when it is not back by its due date" and the label "suspension". I added no new requests for patrons.
- **Commit message:** It says "not run: docs-only change, no tests cover this file". That is still accurate, and the later `npm test` run didn't change the file.