# Git Weekly Changelog

**Analysis basis**

- Generated: `2026-10-23`
- Range: `2026-10-14` → `2026-10-20` (UTC timestamps; commits after 2026-10-20 23:59:59Z excluded)
- Branch: `main`
- Method: read-only git inspection (no tests or builds were run)

---

## 🚀 New Features

**Search**
- Bookings can now be searched by guest name.
- Bookings can be filtered by date.

**Billing**
- Invoices can be downloaded as PDF.

**Orders API**
- Initial orders API added, including creating orders via `POST /orders` (with input validation and router tests).

## 🐛 Bug Fixes

- **Search:** an empty search no longer crashes the page.
- **Billing:** tax is now rounded to the cent.
- **Auth:** sessions no longer expire while a form is open, so in-progress input isn't lost.

## ♻️ Refactoring & Internals

- **Billing:** the invoice module was split up; this is a refactor with no intended behaviour change.

## 🗂️ Dependencies & Tooling

- Dependencies bumped; the package version went from 0.1.0 to 0.1.1.

## 📚 Documentation

- API reference updated (`docs/API.md`).

---

**Summary**

This week centred on booking search (guest name, date filter, empty-search fix) and billing (PDF invoices, tax rounding, module split), with the first version of the orders API landing mid-week and an auth session-expiry fix. Not included: the occupancy heatmap (`feat(reports)`, 2026-10-21) falls after the window and belongs in next week's notes.
