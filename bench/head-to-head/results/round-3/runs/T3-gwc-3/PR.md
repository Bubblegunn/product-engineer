# Format the code, and a change to how stay totals are calculated

## Summary

This branch is mostly a formatting pass over the code (line breaks, quote style, layout). It does not change what guests see in reminder emails or what is in the CSV export.

**It also contains one change that is not formatting.** It changes how the total price of a stay is calculated, and it can make totals one cent lower than they are today. Details are below. The commit message says "no functional change", which is wrong for this one line.

## Change that affects behaviour: stay totals (`src/pricing.js`)

- **Before:** total = nightly rate × number of nights.
- **After:** the same total, rounded **down** to whole cents.

The rounding is applied to the computed total, so some totals come out a cent short because of how computers store decimal numbers. Examples I ran:

| Nightly rate | Nights | Before | After |
|---|---|---|---|
| 1.15 | 1 | 1.15 | **1.14** |
| 0.29 | 100 | 29 | **28.99** |
| 19.99 | 3 | 59.97 | 59.97 |
| 100 | 3 | 300 | 300 |

Many totals are unaffected, but some are off by one cent. Where a total is shown to a guest or used for billing, that would be an undercharge, and it would not be obvious to anyone looking at it.

**Needs a decision before merging:** either drop this line from the branch (my recommendation, since it was not part of the formatting work and there is no test or description explaining the intent), or keep it as a deliberate rounding change in its own PR. If it is intended, it should round to the nearest cent rather than down, and have a test.

## Formatting only (no change in behaviour)

- `src/export.js`: CSV export code split across lines and switched to double quotes. The output is the same.
- `src/list.js`: one-line function expanded to several lines.
- `src/mail.js`: the reminder email body is now built from a list of lines joined with line breaks instead of one long string. I compared the two and the text is identical. The export list is also spread over lines.
- `test/reminders.test.js`: reformatted. The tests check the same things as before.
- `README.md`: the description is split over two lines. The wording is the same.

## Testing

I only read the diff. I did not run the test suite, and no test covers pricing.
