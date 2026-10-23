I saved the changelog to `CHANGELOG-WEEK.md`. It covers the nine commits on `main` from 14 to 20 October 2026, grouped into four areas. I only read git history, so no builds or tests were run.

- **Booking search:** search by guest name and a date filter, plus a fix for the crash on an empty search.
- **Billing and invoices:** PDF invoice download and tax rounded to the cent. The invoice module was also split up, which is an internal refactor.
- **Authentication:** sessions no longer expire while a form is open.
- **Documentation and tooling:** an update to the API reference and a version bump.

Two things you might not expect:
- **Occupancy heatmap left out:** that commit is dated 21 October, after the window. I noted it in the file as belonging to next week.
- **"Bump dependencies" commit:** it only changed the `package.json` version from 0.1.0 to 0.1.1, with no dependency changes, so the changelog says that.