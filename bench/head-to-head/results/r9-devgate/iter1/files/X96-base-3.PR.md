## Early check-in reminder, and settings read from a config file

### Changes

**Early check-in reminder** (`src/early-checkin.js`)
- Adds `earlyCheckinDue(booking, now)`. It returns true when the booking's check-in is in the future and no more than 6 hours away. The 6-hour boundary is inclusive.
- Tests cover a check-in 4 hours away (due), a day away (not due) and exactly 6 hours away (due).

**Settings from config** (`src/settings.js`, `config/settings.json`)
- `load()` now reads `config/settings.json` instead of returning hard-coded defaults.
- The `DEFAULTS` export is removed. Nothing else in the repo imports it.

### Behaviour change: `autoCancelUnpaid` default flips from `true` to `false`

The settings commit is labelled "No behaviour change", but that isn't accurate. The old hard-coded default was `autoCancelUnpaid: true`. The new `config/settings.json` sets it to `false`.

`autoCancelUnpaid()` in `src/bookings.js` returns no bookings when the setting is false. With this PR, unpaid bookings stop being auto-cancelled unless the setting is overridden.

**Decision for the reviewer:** if the flip is intentional, this needs to be called out as a behaviour change. If not, change the value in `config/settings.json` back to `true`. I haven't changed it, because I don't know which is intended.

### Other notes
- `load()` now fails if `config/settings.json` is missing or invalid JSON. The old version could not fail.
- I did not run the tests for this description.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
