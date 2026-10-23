I saved the changelog as `CHANGELOG-WEEK.md`. It's grouped by feature area and covers 14–20 October 2026, commit e7293a8 to 921093e.

**Correction:** my earlier "passes" referred to the notes format check, not the project's tests. I have now run both after the last edit:
- `npm test` printed `ℹ tests 6`, `ℹ pass 6`, `ℹ fail 0`.
- `product-engineer notes CHANGELOG-WEEK.md --range e7293a8~1` printed `notes: ok (0 warnings)`.

The tests don't exercise the changelog. They only show the repo is healthy, and the only file I changed is the changelog.

Contents:
- **Search:**
  - You can search bookings by guest name.
  - You can filter bookings by date.
  - An empty search no longer crashes the page.
- **Billing:**
  - You can download an invoice as a PDF.
  - Tax is now rounded to the cent.
- **Account and sign-in:** You no longer get signed out while a form is open.

I left out the invoice code split, the API docs update and the dependency bump, because readers wouldn't notice them. I also left out the occupancy heatmap. It was committed on 21 October, after the week ended, so it belongs in next week's changelog.

The entries have no commit hashes or code names. The range appears only on the first line.