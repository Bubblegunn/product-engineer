# Early check-in reminder, and settings moved to a file

For the customer:
What changed: Guests who are due to check in within the next 6 hours are now picked out for an early check-in reminder. Separately, the hotel's settings now come from a settings file, and that file switches off automatic cancellation of unpaid bookings, which was on before.
Why it matters: Guests arriving soon can be reminded in time. Hotels that relied on unpaid bookings being cancelled automatically will no longer get that unless they turn it back on.
Automation effect: Unpaid bookings are no longer cancelled automatically (this is a loss of automation, not a gain).

## Warning: one setting changed value

The settings commit (`86c1779`) is titled "No behaviour change", but that is not true. `autoCancelUnpaid` was `true` in the old built-in defaults in `src/settings.js` and is `false` in the new `config/settings.json`. Anything that reads the settings and calls `autoCancelUnpaid` in `src/bookings.js` will now cancel nothing. Decide before merging: either set it to `true` in `config/settings.json` to keep the old behaviour, or keep `false` on purpose and fix the commit message.

## What the diff shows

- `src/early-checkin.js` (new): `earlyCheckinDue` is true when check-in is in the future and at most 6 hours away. Exactly 6 hours counts as due; a check-in already past does not. Nothing calls it yet, so no reminder is sent by this PR.
- `test/early-checkin.test.js` (new): three cases: 4 hours away (due), a day away (not due), exactly 6 hours (due). I did not find a test for a check-in in the past.
- `config/settings.json` (new) and `src/settings.js`: defaults now come from the file, read each time `load()` is called. `reminderHours` is unchanged at 24. The exported `DEFAULTS` is removed; a search of `main` and `feature` found no other user of it. If the file is missing or not valid JSON, `load()` now throws, where before it could not fail. I did not trace how callers handle that.

## Observed

ran `node --test` on `feature`: 6 passed, 0 failed.
not checked: no test covers `load()` or the contents of `config/settings.json`, which is why the `autoCancelUnpaid` change passes unnoticed. I did not run the app.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
