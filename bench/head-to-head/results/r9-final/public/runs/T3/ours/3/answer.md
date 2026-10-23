I wrote the pull request description in `PR.md`. It opens with the plain-language "For the customer" block, so the account manager can stop after the first screen.

**This branch is not formatting-only.** The commit says "no functional change", but `src/pricing.js` now rounds stay totals down to whole cents (`Math.floor(rate * nights * 100) / 100`). That changes behaviour, and it sometimes makes a total one cent too low.
- I tried 200,000 combinations: rates from 0.01 to 500.00 with 1, 2, 3 and 7 nights. In 16,222 of them the new total is a cent below the correct one.
- For example, a rate of 0.29 for 1 night gives 0.28, and 0.15 for 3 nights gives 0.44 instead of 0.45.
- I didn't check where `nightlyTotal` is called, so I can't say which screens or invoices it affects.
- No test covers it.
- `PR.md` recommends dropping that change from the branch. If rounding to cents is wanted, it should be its own change with a test, and it should round to the nearest cent.

**What I traced.**
- **Reminder email and CSV export:** The email body and the CSV export produce identical output.
- **`list.js` and the README:** `list.js` is reformatted only, and the README sentence is just split over two lines.
- **Tests:** In the reformatted tests I found no changed check.

**Test result.** I re-ran `npm test` just now (`node --test`). It printed `ℹ tests 5`, `ℹ pass 5`, `ℹ fail 0`. I updated `PR.md` to quote those lines as printed. The tests cover the CSV, the email subject and body, and reminder timing. They don't cover pricing, so the pass says nothing about the pricing change.

**Not checked.** I didn't run the app, send real emails, or look at the callers of `nightlyTotal`. I haven't committed anything or changed any code; `PR.md` is the only file I created.