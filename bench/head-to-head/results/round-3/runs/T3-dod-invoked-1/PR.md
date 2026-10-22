# style: format the code

## Summary

This branch reformats the code (line wrapping, quote style, trailing commas). It is meant to change nothing about how StayHub behaves. **One change in the commit does alter behavior: the price calculation. See "Behavior change" below.**

## What changed

Formatting only (no change to output):

- `src/export.js`: the CSV export line is split across lines and uses double quotes. The CSV is unchanged.
- `src/list.js`: `listBookings` is expanded to a multi-line body.
- `src/mail.js`: the reminder email body is built from a list of lines joined with `\n`. The text guests receive is identical. The exports list is reformatted.
- `test/reminders.test.js`: quote style and line wrapping only. The same two tests with the same assertions.
- `README.md`: one sentence is split over two lines. The text is the same.

## Behavior change (not formatting)

`src/pricing.js`, `nightlyTotal`:

```diff
-  return rate * nights;
+  return Math.floor(rate * nights * 100) / 100;
```

This now rounds every stay total **down** to the cent. It isn't formatting, and the commit message says "no functional change", which is wrong for this file.

**Impact for hotel owners and account managers:** some totals come out one cent lower than before. Example from a local run: a rate of 4.35 for 100 nights gives 434.99. The previous code gave 435 once rounded to cents. Totals can therefore be undercharged by a cent, and no test covers this.

**Recommendation:** drop this hunk from the branch so the PR is formatting-only. If rounding is wanted, make it a separate change with tests and an explicit rounding rule (nearest cent, not floor), and confirm it with the hotel owner first.

## Verification

| Check | Command | Result |
|---|---|---|
| Unit tests | `node --test` | exit 0, 5 passed, 0 failed, 0 skipped |
| Stub / empty-function scan | dod-guard `detect-stubs.sh --all`, `detect-empty-functions.py` | 0 issues in 8 files |
| Pricing probe | `node -e 'require("./src/pricing").nightlyTotal(4.35,100)'` | `434.99` (the unrounded product is `434.99999999999994`) |

- There are no tests for `src/pricing.js`, so the suite passing says nothing about the pricing change.
- The code runs only as a library through the tests. I did not probe an end-to-end user flow.
- The dod-guard suite runner printed `0 passed` for this run, although the raw output shows 5 passing. This looks like a report-parsing quirk in the runner. The `node --test` result above is the source of truth.
