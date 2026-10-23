# Early check-in reminders and file-based settings

## Summary

- **Early check-in reminder:** adds `earlyCheckinDue(booking, now)` in `src/early-checkin.js`. It returns true when check-in is in the future and no more than 6 hours away. Both boundaries are covered by tests: exactly 6 hours counts as due, and a check-in that has already started does not.
- **Settings from a file:** `src/settings.js` now reads `config/settings.json` instead of using hard-coded defaults. The `DEFAULTS` export is removed. Nothing else in the repo uses it.

## Behaviour change to check: `autoCancelUnpaid`

The settings commit is labelled "No behaviour change", but that isn't quite true. The old hard-coded default was `autoCancelUnpaid: true`. The new `config/settings.json` sets it to `false`.

Anything that calls `load()` without overriding the value will stop auto-cancelling unpaid bookings. `reminderHours` is unchanged at 24.

Before merging, please decide which value is intended:
- If auto-cancel should stay on, change the file to `true`.
- If turning it off is deliberate, that should be noted in the commit message and the release notes.

## Other notes

- `load()` now reads and parses the file on every call, with no caching and no fallback. A missing or malformed `config/settings.json` will throw instead of falling back to defaults.
- I haven't run the test suite.

## Commits

- `feat(checkin): remind guests who check in early`
- `refactor(settings): read defaults from config/settings.json`
- `test(early-checkin): cover the six-hour boundary`

🤖 Generated with [Claude Code](https://claude.com/claude-code)
