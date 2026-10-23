I saved the changelog as `CHANGELOG-WEEK.md` in the repo root. It covers 11 commits from 14 to 20 October 2026, grouped under Search, Billing, Orders, Authentication and Maintenance.

- **Orders commits:** The two orders commits (`3140958` and `f555c4d`, 14 and 15 October) sit below an older commit in the history. A plain date filter skips them, so I included them by author date.
- **Excluded commits:** I left out the CSV export (10 October) and the occupancy heatmap (21 October) because they fall outside the week.
- **Dependency bump:** The commit message doesn't say which packages changed, so the entry says so.
- **Tax rounding:** I added a note to check invoices created before the rounding fix. That advice is mine and doesn't come from the git history.
- **Breaking changes:** The summary says nothing is marked as breaking. That only means no commit message flags one. I didn't read the diffs.