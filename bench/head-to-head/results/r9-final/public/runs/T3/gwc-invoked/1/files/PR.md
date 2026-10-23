# Format the code, and fix a pricing change that slipped in

**Analysis basis**

- Generated: `2026-10-23 11:38:05 +03`
- Range: `2026-10-21` (one commit on this branch; `main` is at `2026-10-15`)
- Branch: `style/format-code` → `main`
- Method: read-only git inspection (`git diff main..HEAD`). Tests were not run.

---

## ⚠️ One change affects prices

The commit is titled "no functional change", but one file does change behavior: `src/pricing.js`.

- **Before:** `nightlyTotal(rate, nights)` returned `rate * nights`.
- **After:** it returns `Math.floor(rate * nights * 100) / 100`, which rounds the total **down** to whole cents.

**What this means for the hotel:** any stay total that isn't already a whole number of cents is now rounded down. For example, a rate of 33.333 over 3 nights goes from 99.999 to 99.99. With ordinary two-decimal rates the totals don't change. Rates with more decimals, such as those from per-night discounts or currency conversion, can come out up to 1 cent lower per stay. Floating-point error can also take 1 cent off an otherwise exact total.

**Decision for reviewers:** this looks like an unintended edit that came in with the formatting. Revert `src/pricing.js` to `rate * nights` unless rounding down is wanted. If it is wanted, it should be a separate, clearly labelled change that the account manager can confirm with the hotel owner. It also has no test coverage today.

## ♻️ Formatting only (no behavior change)

- **Booking CSV export** (`src/export.js`): the header and rows are split across lines. The output is identical.
- **Booking list** (`src/list.js`): the one-line function is expanded to several lines.
- **Reminder email** (`src/mail.js`): the body is built from a list of lines joined with newlines instead of one long string. The text guests receive is the same: greeting, "Your stay at … starts tomorrow. Check-in opens at …", "See you soon!". The exports are also laid out one per line.
- **Reminder tests** (`test/reminders.test.js`): single quotes become double quotes and long lines are wrapped. The test cases are unchanged.
- **README**: one sentence is split into two lines. The wording is the same.

---

**Summary**

This PR is mostly code formatting across 6 files (37 additions, 16 deletions). The exception is the stay-total rounding in `src/pricing.js`, which can lower a guest's price by up to a cent. Please decide whether to keep it before merging. Nothing else here changes what guests or hotel staff see. Tests were not run for this write-up.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
