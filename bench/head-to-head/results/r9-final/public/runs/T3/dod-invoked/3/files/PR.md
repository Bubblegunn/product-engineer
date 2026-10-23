# Format the code (and one price-calculation change that needs a decision)

## Summary

This branch reformats the source and tests so the code style is consistent (line breaks, quote style, trailing commas). Guests see no change in the reminder emails, the booking list or the CSV export.

**One exception.** `src/pricing.js` also contains a real behavior change, not just formatting. It affects the price shown for a stay, so please read the next section.

## Heads-up for the hotel owner / account manager: stay totals can come out 1 cent low

`nightlyTotal(rate, nights)` used to return `rate * nights`. It now rounds the result *down* to the cent:

```js
return Math.floor(rate * nights * 100) / 100;
```

Because of how computers store decimal numbers, rounding down can drop a cent that should be there. I ran the new function against the old one:

| Nightly rate | Nights | Old result | New result |
|---|---|---|---|
| 0.29 | 1 | 0.29 | **0.28** |
| 0.57 | 1 | 0.57 | **0.56** |
| 1.15 | 1 | 1.15 | **1.14** |
| 19.99 | 3 | 59.97 | 59.97 |
| 100 | 2 | 200 | 200 |

Rates that actually occur in hotels (for example 89.90 or 120.10) may hit the same problem. I did not test them all. A guest could be shown, or charged, a total one cent too low.

This change appears to have come in with the formatting commit and is not mentioned in its message. There is also no test covering `nightlyTotal`. **Recommendation:** revert that line to `return rate * nights;`. If rounding to the cent is wanted, make it a separate change that rounds to the nearest cent, with tests. I have not changed the code, so this needs a decision before merge.

## What changed

- `src/export.js`, `src/list.js`, `src/mail.js`, `test/reminders.test.js`, `README.md`: formatting only (the README text is split over two lines). The reminder email text is identical.
- `src/pricing.js`: the behavior change described above.

## Testing

Run from the repo root:

- `npm test` (via the DoD-Guard suite runner): exit code 0, 5 passed, 0 failed, 0 skipped.
- Stub/TODO scan and empty-function scan: 0 issues across 8 files.
- Manual probe of `nightlyTotal` (the table above): found the cent-rounding problem. The test suite does not catch it because no test covers pricing.

## DoD-Guard verdict

`/dod:verify` is **FAIL** because of the unintended pricing change. The automated checks themselves were clean. I did not refresh the verify marker.
