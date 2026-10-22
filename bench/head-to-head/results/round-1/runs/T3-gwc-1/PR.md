## Remove the check-in date from the bookings CSV export

### What changes for users
The bookings CSV export no longer includes the **check-in date**. Each export now has two columns, `id` and `guest`, where it previously had `id`, `guest` and `checkIn`.

| | Before | After |
|---|---|---|
| Header | `id,guest,checkIn` | `id,guest` |
| Example row | `1,Ana,2026-10-21` | `1,Ana` |

Anyone who uses the export to see arrival dates, such as hotel staff or reports built from the file, will lose that information. Spreadsheets or scripts that read the third column will also break.

### Is this intended?
This branch is named "tidy export", and the commit message is "tidy export code". The code was restructured into a loop, which is a tidy-up. The same commit also dropped the `checkIn` column, and that is a behaviour change, not a tidy-up. The commit message doesn't mention it. **The author should confirm the removal is deliberate. If it isn't, the column should be restored before merging.**

### Code changes
- `src/export.js`: `toCsv` builds its rows in a loop and then joins them. It no longer writes `checkIn`.
- `test/export.test.js`: the expected output is updated to the two-column format.

### Testing
The one existing test was updated to expect the new output. I haven't run it as part of writing this description.
