# Weekly changelog: 14 to 20 October 2026

**Purpose:** Lists what changed in the codebase from 14 to 20 October 2026, grouped by feature area.
**Reader:** The product and engineering team.
**Date:** Written 23 October 2026 from the git history on `main`.

## Overview

The week brought 9 commits: 3 new features, 3 fixes and 3 maintenance changes. Search gained guest-name search and a date filter. Billing gained PDF invoice download. Two fixes need no action from you: one stops a search crash and one keeps sessions alive. Billing tax is now rounded to the cent, so expect small changes in some totals.

## Search

- **Search by guest name:** You can now search bookings by guest name (`e7293a8`, 14 Oct).
- **Filter by date:** You can now filter bookings by date (`17e9fb2`, 16 Oct).
- **Empty search fixed:** An empty search no longer crashes the page (`dff9952`, 15 Oct).

## Billing

- **PDF invoices:** You can now download an invoice as a PDF (`438513d`, 17 Oct).
- **Tax rounding:** Tax is now rounded to the cent (`6be51f2`, 18 Oct). Totals on some invoices may differ by a cent from earlier ones.
- **Invoice module split:** The invoice module was split into smaller parts (`2353c31`, 20 Oct). This is an internal refactor, so it changes no behaviour.

## Authentication

- **Sessions stay open during forms:** Sessions no longer expire while a form is open (`af6cd4b`, 19 Oct).

## Documentation and dependencies

- **API reference:** The API reference was updated (`7683aaa`, 20 Oct).
- **Dependency bump:** A dependency version in `package.json` was raised (`921093e`, 20 Oct). The commit does not name the package, so check `git show 921093e` for details.
