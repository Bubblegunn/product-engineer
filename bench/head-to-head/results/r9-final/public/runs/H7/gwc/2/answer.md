I wrote the changelog to `CHANGELOG-WEEK.md` in the repo root. It covers the nine commits on `main` from 14 to 20 October 2026. I only read the git history. I didn't run any builds or tests.

- **Search:**
  - You can now search bookings by guest name.
  - You can filter bookings by date.
  - An empty search no longer crashes the page.
- **Billing:**
  - Invoices can be downloaded as PDF.
  - Tax is rounded to the cent.
  - The invoice module was split up (refactor).
- **Auth:** Sessions no longer expire while a form is open.
- **Docs and dependencies:** The API reference was updated and dependencies were bumped.

The occupancy heatmap commit (`ebe42d6`) falls outside the week, so I left it out and noted that in the summary.