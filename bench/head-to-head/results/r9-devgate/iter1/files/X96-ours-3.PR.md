# Early check-in reminder check, and settings moved to a file

For the customer:
What changed: The code now has a check that recognises a guest who is arriving within the next 6 hours, so they can be sent an early check-in reminder. It is not connected to anything that sends reminders yet, so guests see no new reminder from this change. The hotel's settings now come from a settings file instead of being fixed in the code. In that file, automatic cancelling of unpaid bookings is switched off, where it was switched on before.
Why it matters: Once the check is connected, guests arriving soon can get a timely reminder. The settings file lets the hotel's settings be changed without editing code. Unpaid bookings will no longer be cancelled automatically unless someone turns that setting back on.

## What the diff shows

- `src/early-checkin.js` (new): `earlyCheckinDue(booking, now)` is true when check-in is in the future and at most 6 hours away. Exactly 6 hours counts as due; a check-in already past does not. Nothing in `src` calls it yet, so no reminder is sent.
- `test/early-checkin.test.js` (new): three tests: 4 hours away is due, a day away is not, exactly 6 hours is due. There is no test for a check-in in the past.
- `config/settings.json` (new) and `src/settings.js`: `load()` now reads the JSON file instead of returning built-in defaults. The `DEFAULTS` export is removed; a search of `src` and `test` on this branch found no other user of it.

## Behaviour change to review: `autoCancelUnpaid`

The commit "refactor(settings)" says "No behaviour change", but the value differs. Before: `autoCancelUnpaid: true` (in `DEFAULTS`). Now: `"autoCancelUnpaid": false` in `config/settings.json`. `src/bookings.js` uses this setting to decide whether unpaid bookings are cancelled, so anything that passes the loaded settings to it will stop cancelling. `reminderHours` is 24 in both.

Please confirm whether `false` is intended. If it is not, change it to `true` in `config/settings.json`. I did not change it. The existing tests pass the setting in by hand and never call `load()`, so no test covers this.

Other things I did not trace: who calls `settings.load()` outside `src` and `test`, and what happens if the settings file is missing or malformed (`load()` would throw).

## Observed

- Ran `npm test` on the `feature` branch in a separate checkout: 6 tests, 6 passed, 0 failed.
- Not run: the app itself. No reminder sending or booking cancelling was exercised.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
