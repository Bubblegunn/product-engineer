# style: format the code (includes one pricing change)

## Summary

This PR reformats the code: line wrapping, quote style, and trailing commas. It touches `README.md`, `src/export.js`, `src/list.js`, `src/mail.js`, `test/reminders.test.js` and `src/pricing.js`.

**One change is not formatting.** It affects what guests are charged. See the next section.

## Behaviour change: nightly totals (`src/pricing.js`)

```diff
-  return rate * nights;
+  return Math.floor(rate * nights * 100) / 100;
```

`nightlyTotal` now rounds the total **down** to whole cents. Before, it returned the raw product. The commit message says "no functional change", which is wrong for this line.

Rounding down can undercharge by one cent when floating-point error leaves the product just below the true value. I ran the new formula on a few inputs:

| rate | nights | true total | old result | new result |
|---|---|---|---|---|
| 0.29 | 100 | 29.00 | 28.999999999999996 | **28.99** |
| 110.10 | 3 | 330.30 | 330.29999999999995 | **330.29** |
| 19.99 | 3 | 59.97 | 59.97 | 59.97 |

Neither the commit message nor any test covers this, and `nightlyTotal` has no callers in `src/` or `test/`. I did not check whether anything outside the repo uses it.

**Recommendation:** revert this line to `return rate * nights;` and keep this PR formatting-only. If rounding to cents is wanted, do it in a separate PR that uses `Math.round` and adds tests.

## Other changes (formatting only)

- **`README.md`:** the one-line description is split over two lines. The wording is the same.
- **`src/export.js`:** the CSV builder is wrapped over several lines and uses double quotes. The output is the same.
- **`src/list.js`:** `listBookings` is expanded to a multi-line body.
- **`src/mail.js`:** `reminderBody` builds the same text from an array joined with `\n`. The exports are expanded to one per line. The reminder email text is unchanged.
- **`test/reminders.test.js`:** quotes and wrapping only. The assertions are the same.

## For the hotel owner's account manager

- Guests will see no change in reminder emails, in the CSV booking export, or in the booking list.
- The only change that could reach money is the `nightlyTotal` rounding above. I recommend it does not ship in this PR.

## Testing

`npm test` (`node --test`) gives 5 passed, 0 failed, 0 skipped.

These tests do not exercise `nightlyTotal`, so a green run says nothing about the pricing change. I did not run an end-to-end probe. For this change the unit tests and the diff check above are the only evidence.

I did not check the other DoD items (docstrings, project-specific criteria) for this PR. `DOD.md` still contains an unfilled project-specific placeholder.
