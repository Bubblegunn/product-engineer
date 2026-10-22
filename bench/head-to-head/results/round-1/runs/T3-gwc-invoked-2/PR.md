# Tidy booking CSV export (this also removes the check-in date column)

**Analysis basis**

- Generated: `2026-10-21 19:20:48 +03`
- Range: `2026-10-20` → `2026-10-21` (one commit on this branch since `main`)
- Branch: `perf/tidy-export` → `main`
- Method: read-only git inspection. Tests were not run for this description.

---

## ⚠️ Heads-up for the hotel owner and account manager

**The booking CSV export no longer includes the check-in date.** The branch name and commit message ("tidy export code") suggest a code cleanup. The change also alters what hotels receive.

| | Columns | Example row |
|---|---|---|
| Before | `id,guest,checkIn` | `1,Ana,2026-10-21` |
| After | `id,guest` | `1,Ana` |

Anyone who uses the export to see arrivals, such as front desk planning or reconciling bookings in a spreadsheet, will lose that information. Any spreadsheet or script that expects three columns may also break.

## ♻️ Refactoring & Internals

- `toCsv` in `src/export.js` now builds rows with a plain loop instead of chaining `concat` and `map`. The loop is the code-style cleanup the commit describes.

## 🐛 Behaviour change (probably unintended)

- While rewriting `toCsv`, the `checkIn` field was dropped from both the header and each row. The commit message doesn't mention this, and I haven't found anything in the history saying it was intended.
- `test/export.test.js` was edited to expect the shorter output (`id,guest\n1,Ana`). The test now passes with the change instead of flagging it.

## Decision needed before merge

- **If the removal is a mistake:** restore `checkIn` in the header and rows, and revert the test expectation to `id,guest,checkIn\n1,Ana,2026-10-21`. The refactor can stay.
- **If the removal is intended:** please say so in the PR title and commit message. The hotel owner should be told before this ships.

---

**Summary**

The intended change is a small tidy-up of the CSV export code. As written, it also removes the check-in date from every exported booking. I recommend restoring that column before merging, unless someone confirms the removal is deliberate.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
