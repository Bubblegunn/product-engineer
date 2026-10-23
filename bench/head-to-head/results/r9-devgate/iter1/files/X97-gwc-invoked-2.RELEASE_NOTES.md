# Release Notes — since v1.4.0

**Analysis basis**

- Generated: `2026-10-23 10:47:00 +03`
- Range: `v1.4.0` → `main` (12 commits, 8 files changed)
- Branch: `main`
- Method: read-only git inspection (tests were not run)

---

## 🚀 What's New

- **Search bookings by guest name.** You can now find a reservation by typing the guest's name. Matching ignores upper/lower case, so "smith" finds "Smith".

## 🔒 Security

- **Safer spreadsheet exports.** If a guest name starts with `=`, `+`, `-` or `@`, spreadsheet programs such as Excel could treat it as a formula when you open an exported CSV. The export now neutralises these values, so exported guest names are shown as plain text.

## 🐛 Fixes

- **Guest names with commas export correctly.** Names such as "Smith, John" used to spill into the wrong column in exported CSV files. They now stay in the guest column.

---

**Summary**

This release adds guest-name search and makes CSV exports safer and more reliable. The remaining changes (code tidying, formatting, extra tests and a README typo fix) are internal and don't change what you see.
