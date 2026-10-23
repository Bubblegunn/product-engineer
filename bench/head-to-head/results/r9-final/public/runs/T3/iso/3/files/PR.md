# Format the code, and a price rounding change that needs a decision

## Summary

This branch reformats the code: line breaks, quote style and trailing commas. It touches the README, the CSV export, the booking list, the reminder email text and the reminder tests. These changes do not alter behaviour.

**One change is not formatting.** `src/pricing.js` now rounds the stay total down to whole cents. Before, it returned the exact result of nightly rate × nights. The commit message says "no functional change", which is wrong for this line.

## The pricing change needs a decision

`nightlyTotal` changed from:

```js
return rate * nights;
```

to:

```js
return Math.floor(rate * nights * 100) / 100;
```

Because of how computers store decimals, this can make a total one cent too low. I ran it:

| Rate | Nights | Old result | New result |
|------|--------|-----------|-----------|
| 0.29 | 1 | 0.29 | **0.28** |
| 4.35 | 1 | 4.35 | **4.34** |

Rates with whole-cent values can lose a cent. If the total is used for invoices or payments, guests could be undercharged. I only ran `nightlyTotal` directly. I did not check which code calls it.

**Recommendation:** remove this line from the branch so it is a pure formatting change. If rounding to cents is wanted, make it a separate change. It should round to the nearest cent (or work in whole cents) and have tests.

## What else changed, and why it is safe

- **`README.md`**: one sentence split over two lines. It displays the same.
- **`src/export.js`, `src/list.js`**: code split over several lines. Same output.
- **`src/mail.js`**: the reminder email body is now built from a list of lines joined with line breaks. The text is identical, so guests receive the same email as before.
- **`test/reminders.test.js`**: quote style and line breaks only. The tests check the same things.

## Testing

`node --test` passes (5 of 5). None of these tests cover `nightlyTotal`, so the tests would not catch the pricing change.
