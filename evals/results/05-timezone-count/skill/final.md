Committed as `d8bbf13`.

## How many guests are affected

**4 of 12.** Guests 3, 6, 9, and 12 — every guest with `timezone: null` in `data/customers.json`.

Counted, not eyeballed:

```
node --input-type=module -e 'import {schedule} from "./src/timezone.js"; ...'
# before: broken hourUtc: 4  →  ids [3, 6, 9, 12]
```

The other 8 are all `Europe/Istanbul` and were getting the correct 06:00 UTC.

## What was wrong

`reminderHour` looked the time zone up in a hardcoded two-entry table:

```js
const offset = { "Europe/Istanbul": 3, "Europe/London": 1 }[customer.timezone];
return 9 - offset;   // undefined → NaN
```

A `null` timezone missed the table, so the send hour came out `NaN` — not a wrong hour, no hour at all. Those four reminders never fired.

There was a second, latent bug in the same line: `Europe/London: 1` is hardcoded to summer time, so London guests would get the reminder an hour off every winter. **0 guests hit that today** (no London guests on the roster), but it was live for the next one added.

## The fix

`src/timezone.js:1` now resolves offsets from the zone database via `Intl.DateTimeFormat` instead of the table. That means any IANA zone works without a code change, and DST is followed automatically. Two things I decided along the way:

- **Missing/unresolvable zone → 09:00 UTC, flagged `fallback: true`.** A real time beats no reminder, and the flag makes those rows findable rather than silently guessed.
- **Reminder times now carry minutes.** An hour-only API puts a guest in India at 08:30 or 09:30 local; `Asia/Kolkata` now lands on 09:00.

## What I observed

7 tests pass (`npm test`), covering the DST winter/summer split, half-hour zones, both fallback paths, and a US clock-change day. Running `schedule()` against the real roster: **0 unusable reminders out of 12**, with 4 on the flagged UTC fallback.

I could **not** check production logs or a real send — the repo has no running service, so this is verified against the checked-in fixture data only.

**One thing I deliberately left out**, also recorded in the commit: those 4 guests get 09:00 UTC, which is a real time but not necessarily 9am *where they are*. Getting that genuinely right means capturing the time zone at booking, which is a booking-flow change well outside this fix. If you want, backfilling those four is the natural next step — the `fallback: true` flag identifies exactly which rows.
