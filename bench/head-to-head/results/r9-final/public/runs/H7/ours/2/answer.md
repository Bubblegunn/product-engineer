I saved the changelog as `CHANGELOG-WEEK.md`. I just re-ran both checks on the saved file, and both pass.

- **Notes check:** `product-engineer notes CHANGELOG-WEEK.md --range e7293a8^` printed `notes: ok (0 warnings)`.
- **Project tests:** `npm test` printed `tests 6`, `pass 6`, `fail 0`, `cancelled 0`, `skipped 0`.

My earlier message said the notes check passed. It did, but the project tests hadn't been run then. The tests don't cover the changelog, since it's a text file. The run only confirms the repo's six tests still pass.

The changelog covers 14–20 October 2026 (commit e7293a8 to 921093e), in three groups:

- **Search:**
  - You can search bookings by guest name.
  - You can filter bookings by date.
  - An empty search no longer crashes the page.
- **Billing:**
  - You can download an invoice as a PDF.
  - Tax is now rounded to the nearest cent.
- **Sign-in:** you no longer get signed out while filling in a form. The session now stays active for 30 minutes from your last activity.

I left some commits out on purpose:
- **Occupancy heatmap:** it was committed on 21 October, so it falls outside the week.
- **Invoice module split:** I dropped this refactor because I couldn't tie it to a specific next feature, and the notes rules only allow a refactor line in that case.
- **API docs and dependency bump:** the skill gives these no line.

The repo has no tags, so the range is stated by commit.