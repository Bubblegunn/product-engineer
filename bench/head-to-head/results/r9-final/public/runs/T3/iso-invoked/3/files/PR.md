# Format the code, and one pricing change that is not formatting

**Purpose:** Explain what this pull request changes in stayhub, and ask for a decision on one price calculation.
**Readers:** Code reviewers first. The hotel owner's account manager also reads it, so the guest-facing effects come first.
**Date:** 2026-10-23

## Overview

Most of this branch only reformats code. Guests see no difference in emails, exports or lists.

One change is not formatting. It changes how the total price of a stay is calculated, and it can lower a total by up to one cent. The commit message says "no functional change", which is wrong for this line. **Decision needed:** keep the new rounding, or remove it from this pull request.

## What changes for hotel guests and owners

- **Prices:** A stay total is now cut down to whole cents instead of kept exact. See the next section.
- **Reminder emails:** The text is the same as before.
- **CSV export of bookings:** The columns and values are the same as before.
- **Booking list:** The result is the same as before.

## The pricing change

The function `nightlyTotal` multiplies the nightly rate by the number of nights. The old code returned that product. The new code rounds it down to two decimal places.

The change is in [`src/pricing.js:3-4`](src/pricing.js#L3-L4):

```js
// before
return rate * nights;
// after
return Math.floor(rate * nights * 100) / 100;
```

Rounding down means a total can be up to one cent lower than the exact amount. Some rates and night counts can also lose a cent to floating-point error (a computer's way of storing decimals). For example, a total that should be 0.29 can come out as 0.28.

Rates with at most two decimal places and whole nights are exact today, so most bills will not change. Rates with more decimals will change.

The branch adds no test for this behaviour.

**Options for the reviewer:**

1. **Remove the change:** Restore `return rate * nights;` and keep this pull request formatting-only.
2. **Keep the change:** Agree that rounding down is the wanted rule, and add a test. Consider rounding to the nearest cent (`Math.round`) instead, which is the usual rule for prices.

## Formatting changes

These changes only move code around. They do not change what it does.

- [`src/export.js:1-5`](src/export.js#L1-L5): Splits one long line in `toCsv` over three lines and switches to double quotes.
- [`src/list.js:2-4`](src/list.js#L2-L4): Puts the body of `listBookings` on its own lines.
- [`src/mail.js:5-17`](src/mail.js#L5-L17): Builds the reminder body from a list of lines joined with newlines. The output text is identical. The file now mixes single and double quotes in places, which a later pass can fix.
- [`test/reminders.test.js`](test/reminders.test.js): Switches to double quotes and wraps long lines. The tests are the same.
- [`README.md:3-4`](README.md#L3-L4): Splits one sentence per line.

## How this was checked

I compared the diff against `main` by reading it. I did not run the tests.
