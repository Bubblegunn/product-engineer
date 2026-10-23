# Remind guests who check in early, and move settings into a config file

For the customer:
What changed: Guests whose check-in is less than six hours away now qualify for an early check-in reminder. Separately, the hotel's default settings now come from a settings file, and in that file unpaid bookings are no longer cancelled automatically.
Why it matters: Guests arriving soon get a nudge in time, and hotels that rely on the old default need to know that automatic cancellation of unpaid bookings is now off unless they turn it back on.
Automation effect: none. Nothing in this change sends the early reminder yet (see below).

## What the diff shows

**Early check-in rule (`src/early-checkin.js`, `test/early-checkin.test.js`).** New function `earlyCheckinDue(booking, now)`. It is true when check-in is in the future and at most 6 hours away, so exactly 6 hours counts and a check-in already past does not. Three tests cover 4 hours away, a day away, and exactly 6 hours. Nothing else in `src` calls it, so no reminder is sent yet.

**Settings from a file (`src/settings.js`, `config/settings.json`).** `load()` now reads `config/settings.json` instead of returning built-in defaults. The `DEFAULTS` export is removed. A search of `src` and `test` found no other use of `DEFAULTS`.

## Behaviour change to review

The settings commit is titled "No behaviour change", but that is not true of the values:

- `autoCancelUnpaid` was `true` in the old built-in defaults and is `false` in `config/settings.json`.
- `reminderHours` is unchanged at 24.

Whatever calls `load()` and passes the result to `autoCancelUnpaid(bookings, settings)` in `src/bookings.js` will stop cancelling unpaid bookings. I did not find a caller of `load()` in this repository, so I did not trace where the live value flows. Please confirm `false` is intended; if not, change it to `true` in `config/settings.json`.

Also not traced: `load()` now throws if the file is missing or is not valid JSON, and no test covers that.

## Checks

Ran `node --test` on the `feature` branch: 6 tests, 6 passed, 0 failed. This covers the three new early check-in tests and the existing booking and reminder tests. No test covers `load()` or the contents of `config/settings.json`, and I did not run the app.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
