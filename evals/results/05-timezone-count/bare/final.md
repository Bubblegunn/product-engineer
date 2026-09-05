**4 guests are affected** — ids 3, 6, 9, and 12. All four have `"timezone": null` in `data/customers.json`.

## What was happening

`reminderHour()` looked the zone up in a hardcoded two-entry table:

```js
const offset = { "Europe/Istanbul": 3, "Europe/London": 1 }[customer.timezone];
return 9 - offset;
```

A miss yields `undefined`, and `9 - undefined` is `NaN`. Those four guests were being scheduled at hour `NaN`. (Worth noting: `JSON.stringify` renders `NaN` as `null`, so if you were eyeballing the schedule as JSON, this looked like a missing value rather than a corrupt one.)

The other 8 guests are all `Europe/Istanbul`, which has no DST and was correct at +3 — so nobody is currently getting a *wrong-but-valid* time, just the four getting no valid time at all.

I also found a latent bug next to it: `Europe/London` was pinned at `+1`, which is only right during BST. Any London guest added in the winter half of the year would have gotten a reminder an hour late. No one is in that bucket today, so it isn't in the count of 4.

## The fix

Offsets now come from the IANA database via `Intl` rather than a hand-maintained table, resolved against the date being scheduled — so DST is correct, and any valid zone works instead of just two. Along the way it handles half-hour zones (reminders now carry minutes; Kolkata was previously unrepresentable) and wraps when 09:00 local lands on the adjacent UTC day (Sydney → 22:00 UTC prior day, where the old arithmetic gave `-2`).

One judgment call worth your review: **for guests with no resolvable zone, I skip them rather than guess.** There's no safe default — falling back to UTC would have fired at 3am for a guest in Tokyo or LA, which is the wrong-time complaint you started with. So `schedule()` now returns only sendable reminders, and a new `unresolved()` export lists who was skipped so the data can be corrected. The tradeoff is that those 4 guests get *no* reminder until someone fills in their time zone. If you'd rather they get something at a default hour, that's a one-line change — but it's a product call, not a code one.

`schedule()` still returns an array, so existing callers keep working and simply stop emitting `NaN` entries.

Added `src/timezone.test.js` covering the NaN regression, DST in both directions, negative and half-hour offsets, day wrap, and invalid zone strings — 7 tests, all passing under `npm test`.

Committed as `ce88877` on a new branch, `fix-reminder-timezones` — you were on `main`, so I branched rather than committing directly to it. Not pushed.

The underlying data gap is still there: those 4 rows need real time zones before anyone gets a reminder.
