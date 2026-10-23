# Format the code, and a pricing change that needs a decision

## Summary

This branch reformats the code (line breaks, quote style, trailing commas). It also contains **one change that is not formatting**: `nightlyTotal` in `src/pricing.js` now rounds totals down to the cent. The commit message says "no functional change", which is wrong for this one line.

## The pricing change (needs review before merge)

Before:

```js
return rate * nights;
```

After:

```js
return Math.floor(rate * nights * 100) / 100;
```

Because of floating-point error, the new code can **under-charge by one cent**. Results from running the new function:

| rate | nights | expected | new result |
|-------|--------|----------|------------|
| 19.99 | 1 | 19.99 | **19.98** |
| 1.15 | 1 | 1.15 | **1.14** |
| 0.29 | 1 | 0.29 | **0.28** |
| 100 | 3 | 300 | 300 |

Nothing in `src/` or `test/` calls `nightlyTotal` yet, and there are no tests for it. So nothing breaks today. Anything that starts using it later would show wrong totals.

**Recommendation:** revert the `pricing.js` change in this PR. If cent rounding is wanted, do it in a separate PR with tests. Rounding to the nearest cent (`Math.round`) or working in integer cents avoids the problem. The hotel needs to say which rule it wants.

## Formatting-only changes (behaviour unchanged)

- `src/export.js`: the CSV builder is split across lines. The output is identical.
- `src/list.js`: the one-line function is expanded to a block. Same behaviour.
- `src/mail.js`: the reminder email body is built from a list of lines joined with `\n` instead of one long template string. The text is identical (same greeting, same check-in line, same sign-off). The exports are also split across lines.
- `README.md`: one sentence is split into two lines. The text is the same.
- `test/reminders.test.js`: quote style and line wrapping only. The same two tests with the same assertions.

## What this means for guests and the hotel

Guest-facing behaviour is unchanged: the reminder email, the booking list and the CSV export all produce the same output as before. The only risk is the pricing line above, and it is not used anywhere yet.

## Testing

- `npm test` (`node --test`): 5 tests, 5 pass, 0 fail, 0 skipped.
- These tests do not cover `nightlyTotal`. The cent errors in the table above come from calling the function directly in Node.
- I did not check the email text or CSV output by comparing before and after. I confirmed they match by reading the diff.

## Known gaps

- `src/mail.js` uses single quotes and the other files use double quotes, so the formatting is not fully consistent.
- The DoD checklist asks for tests on new code paths. The pricing change has none, which is another reason to pull it out.
