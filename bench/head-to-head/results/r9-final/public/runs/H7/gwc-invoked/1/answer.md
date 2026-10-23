I've saved the changelog to `CHANGELOG-WEEK.md`. It's built from read-only git inspection, so I didn't run any tests or builds.

It covers 14–20 October 2026 and is grouped by area:
- **Search:** search by guest name, a date filter, and a fix for the empty-search crash.
- **Billing:** PDF invoice download, tax rounding to the cent, and the invoice module split.
- **Orders API:** the initial API and `POST /orders`.
- **Auth:** the fix for sessions expiring while a form is open.
- **Dependencies and docs:** a dependency bump (version 0.1.0 to 0.1.1) and an API reference update.

- **Orders commits:** the date-limited `git log` skipped the two orders commits, even though they're dated 15 and 14 October. I found them in the full history and included them.
- **Left out:** the occupancy heatmap commit is dated 21 October, so it falls after the window. The changelog notes that it belongs in next week's notes.