## Early check-in reminder, and settings moved to a JSON file

### What's in here

1. **Early check-in reminder** (`src/early-checkin.js`): adds `earlyCheckinDue(booking, now)`. It returns `true` when the booking's check-in is in the future and no more than 6 hours away. Check-ins that have already started, or that are more than 6 hours out, return `false`. Tests cover a check-in 4 hours away, one a day away, and one exactly 6 hours away. The 6-hour limit is inclusive.

2. **Settings read from `config/settings.json`** (`src/settings.js`): `load()` now parses the JSON file on each call instead of returning hardcoded defaults. The `DEFAULTS` export is removed. Nothing else in `src` or `test` imported it.

### ⚠️ Behaviour change: `autoCancelUnpaid` default flips from `true` to `false`

The settings commit is labelled "No behaviour change", but that isn't accurate. The old hardcoded default was `autoCancelUnpaid: true`. The new `config/settings.json` ships with `"autoCancelUnpaid": false`. `reminderHours` is unchanged at 24.

`autoCancelUnpaid` in `src/bookings.js` reads this setting, so after this PR unpaid bookings are no longer auto-cancelled unless someone sets it back to `true`.

**Reviewer: please confirm which value is intended.** If the flip is a mistake, change the JSON value to `true`. If it's deliberate, it should be called out in the release notes.

### Other notes

- `load()` reads the file synchronously on every call, with no caching or fallback. A missing or malformed `config/settings.json` will throw.
- `earlyCheckinDue` is not wired into any caller yet. This PR adds the function and its tests only.

### Testing

Added `test/early-checkin.test.js` with the three cases above. I haven't run the suite as part of writing this description.
