# Git Weekly Changelog

**Analysis basis**

- Generated: `2026-10-23`
- Range: `2026-10-14` → `2026-10-20` (inclusive, UTC timestamps as recorded in commits)
- Branch: `main`
- Method: read-only git inspection (no builds or tests were run)

---

## 🚀 New Features

**Search**
- Bookings can now be searched by guest name.
- Bookings can be filtered by date.

**Billing**
- Invoices can be downloaded as PDF.

**Orders API**
- Orders can be created via `POST /orders` (router change with a matching test). The initial orders API scaffolding landed in the same stretch of history.

## 🐛 Bug Fixes

- **Search:** an empty search no longer crashes the page.
- **Billing:** tax is now rounded to the cent.
- **Auth:** sessions no longer expire while a form is open, so users don't lose in-progress input.

## ♻️ Refactoring & Internals

- **Billing:** the invoice module was split up, which should make the PDF and tax code easier to maintain.

## 📚 Documentation

- API reference updated.

## 🗂️ Dependencies & Tooling

- Dependencies bumped.

---

**Not included**

- The occupancy heatmap in reports (committed 2026-10-21) falls outside this week's range and belongs in next week's changelog.
- The CSV export (2026-10-10) predates the range.

**Summary**

This week centred on booking search (name search, date filter, and a crash fix) and billing (PDF invoices, tax rounding, and an invoice module refactor), plus an auth session fix, the new orders endpoint, and routine docs and dependency updates.
