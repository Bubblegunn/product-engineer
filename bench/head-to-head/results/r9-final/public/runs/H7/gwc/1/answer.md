I saved the changelog to `CHANGELOG-WEEK.md`, grouped by feature area. I built it from `git log` on `main` for 14–20 October 2026 and didn't run any builds or tests.

- **Search:** guest-name search, date filtering, and a fix for the empty-search crash.
- **Billing:** PDF invoice download, tax rounding to the cent, and the invoice module split.
- **Auth:** sessions no longer expire while a form is open.
- **Docs and dependencies:** the API reference update and the dependency bump.

The occupancy heatmap commit (`ebe42d6`) falls outside the window, so I left it out and said so in the summary.

I used the skill's format but replaced its generic headings with the feature-area ones above. I haven't committed the file.