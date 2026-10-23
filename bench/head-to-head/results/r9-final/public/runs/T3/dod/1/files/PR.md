# style: format the code

## Summary

Reformats the source and test files (line wrapping, quote style, trailing commas). The commit message says "no functional change", but **one line does change behavior**: `src/pricing.js`. See "Behavior change" below. It needs a decision before merge.

## Formatting-only changes

- `README.md`: the intro sentence is split over two lines. The rendered text is the same.
- `src/export.js`, `src/list.js`, `src/mail.js`, `test/reminders.test.js`: line wrapping and quotes only.
  - The reminder email text is unchanged. `reminderBody` is now built from an array joined with newlines and produces the same string as before.
  - The CSV export output is unchanged.
  - The reminder tests are unchanged apart from layout.

## Behavior change: `src/pricing.js`

`nightlyTotal` changed from

```js
return rate * nights;
```

to

```js
return Math.floor(rate * nights * 100) / 100;
```

This rounds the stay total **down** to whole cents. That isn't formatting. It also introduces a bug: floating-point error can make the total one cent too low.

Checked by running the function:

| Call | Result | Correct |
|---|---|---|
| `nightlyTotal(0.29, 100)` | 28.99 | 29.00 |
| `nightlyTotal(19.99, 3)` | 59.97 | 59.97 |
| `nightlyTotal(100, 2)` | 200 | 200 |

Totals can be wrong by 1 cent for some rate and night combinations. I found no callers of `nightlyTotal` in this repo, so I can't say where it feeds into guest-facing prices or invoices.

**For the hotel owner / account manager:** if this function is used for prices shown to guests or for invoices, some totals could be 1 cent low.

**Recommendation:** revert this line to `return rate * nights;` and keep the formatting commit purely cosmetic. If cent rounding is wanted, make it a separate change that uses `Math.round` and has tests.

## Testing

- `node --test`: 5 tests, 5 pass, 0 fail.
- No test covers `nightlyTotal`, which is why the change above wasn't caught.
- No new tests were added. This is a formatting change.
