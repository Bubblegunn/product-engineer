# Changelog for 14 to 20 October 2026

**Purpose:** This changelog lists what changed in the code between 14 and 20 October 2026, grouped by feature area.

**Reader:** The engineering team.

**Date:** Written on 23 October 2026 from the git history on `main`.

## Summary

Nine commits landed this week in four areas: search, billing, authentication and maintenance. Search gained two things: a guest-name search and a date filter. Billing gained PDF invoice download and a tax rounding fix. Authentication no longer expires sessions while a form is open.

Left out: commit `ebe42d6` (occupancy heatmap) is dated 21 October, so it belongs to next week's changelog.

## Search: new guest and date filters, one crash fixed

- **Guest name search:** You can now search bookings by guest name. Commit `e7293a8`, 14 October, in `src/search.js`.
- **Empty search fix:** An empty search no longer crashes the page. Commit `dff9952`, 15 October, in `src/search.js`.
- **Date filter:** You can now filter bookings by date. Commit `17e9fb2`, 16 October, in `src/search.js`.

## Billing: PDF invoices and exact tax

- **PDF download:** You can now download an invoice as a PDF. Commit `438513d`, 17 October, in `src/billing.js`.
- **Tax rounding:** Tax is now rounded to the cent. Commit `6be51f2`, 18 October, in `src/billing.js`.
- **Invoice module split:** The invoice code moved into its own module, `src/invoice.js`, which now holds `invoiceTotal`. This refactor changes no behaviour. Commit `2353c31`, 20 October.

## Authentication: sessions stay alive during form entry

- **Session expiry fix:** Sessions no longer expire while a form is open. Commit `af6cd4b`, 19 October, in `src/auth.js`.

## Maintenance: docs and version

- **API reference:** `docs/API.md` now states that `POST /orders` needs the `x-token` header. Commit `7683aaa`, 20 October.
- **Version bump:** `package.json` moved from version 0.1.0 to 0.1.1. Commit `921093e`, 20 October. Its message says "bump dependencies", but the diff changes only the package version and no dependency.
