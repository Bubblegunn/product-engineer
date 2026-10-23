I saved the changelog to `CHANGELOG-WEEK.md` in the repo root. It covers 14–20 October 2026 on `main`, grouped by feature area.

- **Features:** search by guest name, search filter by date, PDF invoice download, and order creation over `POST /orders`.
- **Bug fixes:** the empty-search crash, tax rounding to the cent, and sessions expiring while a form is open.
- **Other sections:** the invoice module refactor, the API reference update and the dependency bump each get their own short entry.
- **Left out:** the occupancy heatmap (21 Oct) is after the window, and CSV export (10 Oct) is before it. I noted both at the bottom of the file.
- **Orders commits:** the two orders commits are dated 14–15 Oct but sit below the older CSV export commit in the history. A plain `--since` log skips them, so I found them by reading the full history and included them.
- **Not run:** I used read-only git commands only and ran no builds or tests.