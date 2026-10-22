# Format the code, plus an unannounced change to stay price calculation

## Summary

The commit is titled "style: format the code, no functional change". It is almost entirely formatting. It also contains **one behaviour change** to how the total price of a stay is calculated. That change needs a decision before this merges. It is described first because it affects what guests are charged.

## Behaviour change: `nightlyTotal` in `src/pricing.js`

Before:

```js
return rate * nights;
```

After:

```js
return Math.floor(rate * nights * 100) / 100;
```

The new code rounds the total **down** to whole cents. This was not mentioned in the commit message and looks unintended. It can also produce a total that is a cent too low, because of how computers store decimal numbers. I ran it:

| Nightly rate | Nights | Correct total | Total after this change |
|---|---|---|---|
| 1.15 | 1 | 1.15 | **1.14** |
| 0.29 | 1 | 0.29 | **0.28** |
| 19.99 | 3 | 59.97 | 59.97 |
| 89.99 | 2 | 179.98 | 179.98 |

Most common rates are unaffected. Some rate and night combinations come out one cent short. Nothing in the test suite covers `nightlyTotal`, so the tests would not catch this.

**Recommendation:** revert this hunk so the PR is purely formatting. If rounding to cents is wanted, it should be a separate, described change. It should use `Math.round`, or work in whole cents, and it should have tests. The hotel and its account manager should agree on the rule first, since it affects what guests are charged.

## Formatting changes (no change in behaviour)

- `README.md`: the one-line description is split over two lines.
- `src/export.js`: the CSV header and rows are laid out over several lines and use double quotes. The output is identical.
- `src/list.js`: `listBookings` is expanded from one line to a normal function body.
- `src/mail.js`: the reminder email body is now built from a list of lines joined with newlines instead of one long string. I compared the two and the text guests receive is identical. The exports are also laid out over several lines.
- `test/reminders.test.js`: quotes and line wrapping only. The tests are the same.

## What this means for hotels and guests

- Guest reminder emails and CSV exports of bookings are unchanged.
- The only possible effect on a hotel is the price total described above, if this merges as is.

## Testing

- I compared the diff by hand. I did not run the test suite, and no tests exist for pricing.
