# style: format the code

## Summary

This PR reformats the code (line wrapping, quote style, trailing commas) across `README.md`, `src/` and `test/`. Almost all of it changes layout only.

**One change is not formatting.** `src/pricing.js` also changes how stay totals are calculated. See "Pricing change" below. The commit message says "no functional change", which is not accurate for this file.

## Formatting-only changes

- `README.md`: the intro sentence is split over two lines. The text is the same.
- `src/export.js`: the CSV builder is wrapped across lines and uses double quotes. The output is identical.
- `src/list.js`: the one-line function is expanded to a block. The behavior is the same.
- `src/mail.js`: the reminder email body is built from a list of lines joined with `\n`, not one long string. The email text is identical. The exports are also spread over several lines.
- `test/reminders.test.js`: quotes and line wrapping only. The same two tests make the same assertions.

## Pricing change (`src/pricing.js`)

Before:

```js
return rate * nights;
```

After:

```js
return Math.floor(rate * nights * 100) / 100;
```

The new code rounds every stay total **down** to the cent. Computers store prices as binary decimals, so a result that should be exactly 330.30 can come out as 330.2999…. Rounding down can then lose a cent.

Checked by running the old and new formulas:

| Rate | Nights | Correct total | Old result | New result |
|------|--------|---------------|------------|------------|
| 19.99 | 3 | 59.97 | 59.97 | 59.97 |
| 89.90 | 3 | 269.70 | 269.70000000000005 | 269.7 |
| 110.10 | 3 | 330.30 | 330.29999999999995 | **330.29** |

**Effect for the hotel owner:** some bookings could be quoted one cent too low. The change does clean up long decimals like 269.70000000000005. Neither version rounds to the nearest cent.

**Recommendation:** either remove this hunk from the PR and handle pricing separately, or use rounding to the nearest cent (`Math.round`) with a test for it. I have not changed the code. That decision belongs to the author.

## Testing

- `npm test` (`node --test`): 5 tests, 5 pass, 0 fail, 0 skipped.
- There are no tests for `src/pricing.js`, so the pricing change above is not covered by the passing suite.
- No end-to-end run of the app was done. The formatting changes were checked by reading the diff.

## Impact

- Guests: the reminder email and the CSV export are unchanged.
- Pricing: affected by the change above, until it is resolved.
