# Format the code, and change how stay totals are rounded

## Summary

This branch mostly tidies the layout of the code. It does not change what the app does, with one exception: **stay totals are now rounded down to whole cents.** That change needs a decision before merging (see below).

## Decision needed: stay totals now round down

The total price of a stay is the nightly rate times the number of nights. Before this branch, the total was used exactly as calculated. Now it is cut off after the second decimal place, so any fraction of a cent is dropped, never rounded up.

- **Example:** a rate of 33.333 for 3 nights was 99.999. It is now 99.99.
- **Who it affects:** any hotel whose rates have more than two decimal places. Rates with at most two decimals, such as 89.50, give the same totals as before.
- **Where:** `src/pricing.js`, function `nightlyTotal`.

The commit message says "no functional change", which is wrong for this one line. Please confirm that rounding down is intended. If it is not, remove that line from the branch. If it is, it would be better as its own pull request, so it is easy to find and undo.

## What else changed (layout only)

None of these change behavior:

- `src/export.js`, `src/list.js`: long lines split up and quotes made consistent. The CSV export gives the same output.
- `src/mail.js`: the reminder email text is now built from separate lines instead of one long string. The email text is identical: the greeting, the "stay starts tomorrow" line with the check-in time, and "See you soon!". The exports list is also spread over several lines.
- `test/reminders.test.js`: same two tests with the same checks, only reformatted.
- `README.md`: the one-line description is split over two lines. The wording is the same.

## How this was checked

I compared the full difference against `main` line by line. I did not run the test suite.
