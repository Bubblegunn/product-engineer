I wrote the PR description to `PR.md`, and it flags a price change hidden in what the commit calls a formatting-only branch. I also corrected two claims I made earlier.

**The pricing change**
- The commit message says "no functional change", but that isn't true for `src/pricing.js`.
- The stay-total calculation (rate times nights) went from the exact product to one rounded down to the cent. A rate of 0.29 for one night now gives 0.28, and 33.333 for three nights gives 99.99 instead of 99.999.
- Nothing in the repo calls `nightlyTotal`, and no test covers it. I didn't check any code outside the repo, so I can't say whether a price shown or charged anywhere depends on it.
- `PR.md` suggests taking that line out and shipping it separately with a test and a decision on rounding. I haven't edited any code.

**The other files**
- `git diff -w main...HEAD --stat` still lists all six changed files: `README.md`, `src/export.js`, `src/list.js`, `src/mail.js`, `src/pricing.js` and `test/reminders.test.js`. The changes aren't whitespace-only, since quotes, line breaks and how the reminder body is built also changed. So my earlier "no behaviour change" claim wasn't backed by a whitespace-aware diff.
- Reading each hunk by hand, I found `src/export.js`, `src/list.js` and `src/mail.js` produce the same output as before. The `README.md` and `test/reminders.test.js` edits only reflow text. That "same output" finding rests on my reading, not on a tool.
- I reran `npm test` and it printed `tests 5`, `pass 5`, `fail 0`. Those tests cover the CSV header and rows, the email subject, the email body and the two reminder-window cases. Nothing tests `src/list.js` or `src/pricing.js`.

**Format and checks**
- `PR.md` opens with a plain-language "For the customer" block for the hotel owner's account manager. The technical detail follows below it. The repo's PR-description check passes with no errors or warnings.
- I didn't check the reminder email as actually sent, only the text in the code. The repo has no formatter config, so I couldn't confirm the formatting matches a tool's output.