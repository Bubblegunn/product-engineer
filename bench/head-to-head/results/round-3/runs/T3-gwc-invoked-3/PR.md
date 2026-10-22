# style: format the code (includes one pricing change)

**Analysis basis**

- Generated: `2026-10-22 06:42:23 UTC`
- Range: `2026-10-21` → `2026-10-21` (one commit, `main..style/format-code`)
- Branch: `style/format-code` → `main`
- Method: read-only git inspection (`git log`, `git diff main..HEAD`). Tests were not run.

---

## ⚠️ Read this first: not purely cosmetic

The commit is titled "no functional change", but one line changes behavior. This is a fix to make before merging, or a decision to make deliberately.

**`src/pricing.js`: `nightlyTotal`**

```diff
-  return rate * nights;
+  return Math.floor(rate * nights * 100) / 100;
```

- **What changed:** the stay total is now cut down (floored) to whole cents instead of being returned as calculated.
- **Why it matters:** the floor runs on a floating-point product. Values like `x * 100` can land just below a whole number (for example `56.99999…`). The floor then drops a cent, so a guest's total could be **one cent too low** for some rates and night counts. I did not run the code to find a specific failing rate.
- **Who is affected:** anything that shows or charges `nightlyTotal`. That is the number the hotel owner bills.
- **Recommendation:** revert this line to `return rate * nights;` in this PR. If rounding to cents is wanted, ship it as a separate change that rounds (`Math.round`) and has tests.

## ♻️ Formatting only (no behavior change)

- **Booking CSV export** (`src/export.js`): the header and row-building code is split across lines and uses double quotes. The CSV output is the same.
- **Booking list** (`src/list.js`): `listBookings` is expanded to a multi-line function. It still returns every booking.
- **Reminder email** (`src/mail.js`): the body is built from a list of lines joined with newlines instead of one long string. The text guests receive is the same. The exports are reflowed.
- **Reminder tests** (`test/reminders.test.js`): double quotes and line wrapping only. The same two cases are checked.
- **README**: the one-line description is split into two lines. The wording is unchanged.

---

**Summary**

This PR reformats the code (quote style, line wrapping, one statement per line), and apart from the pricing line above it does not change behavior. For the hotel owner's account manager: guest reminder emails, the booking list and the CSV export are unchanged. The one thing to confirm before release is the stay-total calculation, which could be off by a cent in some cases. Fix that first. Tests were not run for this write-up.
