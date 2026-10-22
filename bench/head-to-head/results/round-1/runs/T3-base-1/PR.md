## Booking CSV export no longer includes the check-in date

### What changes for the hotel owner
The bookings CSV export now has two columns, `id` and `guest`. The `checkIn` column that the export had until now is gone.

Before:
```
id,guest,checkIn
1,Ana,2026-10-21
```

After:
```
id,guest
1,Ana
```

Anyone who uses the export to see arrival dates, for example for a spreadsheet, front-desk prep or a report, will no longer get them. Any import or script that expects three columns will also break.

### What changes in the code
The commit is titled "tidy export code". It rewrites `toCsv` in `src/export.js` as a loop. While doing so it also dropped the `checkIn` field from the header and from every row. The existing test in `test/export.test.js` was edited to expect the two-column output, so it passes.

No other files are touched. The export was added in the previous commit (`feat(export): add CSV export of bookings`).

### Open question for reviewers
I can't tell from the diff whether removing `checkIn` was intended. The commit message describes a refactor, and nothing in the change explains a product decision. Please confirm one of these before merging:

- **Unintended:** restore the `checkIn` column. The loop refactor can stay, but the header and rows need `,${b.checkIn}` and the test needs its original expectation back.
- **Intended:** the owner should be told that the export no longer has arrival dates. The commit message and this description should say so.

### Testing
- The unit test in `test/export.test.js` passes against the new two-column output. The full suite (5 tests) passes.
- That test was changed in the same commit as the code, so it doesn't protect against the dropped column.
