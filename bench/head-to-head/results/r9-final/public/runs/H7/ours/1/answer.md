I saved the changelog as `CHANGELOG-WEEK.md`. The tests and the notes check both pass, and I've re-run both since the last edit.

**Correction to my earlier message:** I said the notes check passed, and the hook read that as a claim about tests. I hadn't run the tests at that point. I have now:
- **`npm test`:** `ℹ tests 6`, `ℹ pass 6`, `ℹ fail 0`. These tests cover the orders API and email validation. They don't touch the changelog.
- **`product-engineer notes CHANGELOG-WEEK.md --range e7293a8^`:** `notes: ok (0 warnings)`. This only works with the installed `product-engineer` command. `npx product-engineer` fetches a different version that has no `notes` command and prints usage text instead. That was the version I called by mistake in the second run.

The changelog covers 14 to 20 October 2026, commits `e7293a8` to `921093e`, grouped by feature area:
- **Search:** search bookings by guest name, filter bookings by date, and the empty-search crash is fixed.
- **Billing:** download an invoice as a PDF, and tax is now rounded to the cent.
- **Accounts and sign-in:** you are no longer signed out while a form is open.

Three things I left out:
- **Occupancy heatmap:** the reports commit (`ebe42d6`) is dated 21 October, so it falls outside the week. It belongs in next week's changelog.
- **Invoice module split:** this is a refactor with no visible follow-on feature named, so it gets no line.
- **API reference update and dependency bump:** these don't change anything a reader would notice.

The sign-in line says what the fix protects and gives no way to exploit it. It is based on reading the session-expiry code. I didn't run the app to watch it happen.