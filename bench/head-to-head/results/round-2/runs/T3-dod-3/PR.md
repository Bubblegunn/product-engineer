# Simplify the reminder filter (changes which guests get reminders)

## Summary

This PR rewrites `dueReminders` in `src/reminders.js` as a single `filter` call. The commit message calls it a refactor with unchanged behaviour. **That is not accurate: the rewrite changes who receives a reminder.**

| | Before | After this PR |
|---|---|---|
| Who gets a reminder | Bookings with check-in **in the next 24 hours** | Bookings with check-in **at any time in the future** |

The 24-hour upper bound is gone. Only the check "check-in is after now" is left.

## What this means for the hotel

If reminders run on a schedule against all bookings, guests with a stay weeks or months away would get a reminder on every run. Before this change, a guest was reminded only on the day before arrival. Please don't read this as a harmless cleanup. It affects what guests see.

## Changes

- `src/reminders.js`: removed the 24-hour window. Updated the comment to match.
- `test/reminders.test.js`: **deleted** the test `ignores bookings further out`. That test covered the 24-hour limit, so it would now fail. Removing it hides the behaviour change instead of flagging it.

## Testing

- `npm test` → exit 0, 4 of 4 pass.
- The passing result is not evidence that behaviour is unchanged, because the one test that covered the removed rule was deleted. The remaining test only checks a booking inside the 24-hour window.
- No end-to-end probe was run. I found nothing else in `src` that calls `dueReminders`, so I couldn't check how reminders are scheduled.

## Recommendation before merging

Pick one:

1. **Keep the refactor, preserve behaviour.** Restore the 24-hour upper bound (a shorter form is fine) and restore the deleted test. This matches the commit message.
2. **The wider window is intended.** Then say so in the commit message and this PR, rename the commit so it isn't a "refactor", and add a test for the new rule.

I recommend option 1 unless the hotel has asked for earlier reminders.
