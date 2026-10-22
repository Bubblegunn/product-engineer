# Simplify the reminder filter (needs a decision before merge)

## Summary

This branch rewrites `dueReminders` in `src/reminders.js` to be shorter. The commit message says "behaviour unchanged", but **the diff does change behaviour**, so please read the next section before merging.

## Behaviour change

**Before:** a booking got a reminder only if check-in was within the next 24 hours.

**After:** a booking gets a reminder if check-in is any time in the future. The 24-hour upper limit is gone.

**What this means for hotels and guests:** the reminder job would pick up every upcoming booking, including ones weeks away. Guests could get reminder emails far too early, and possibly on every run of the job until check-in. That would be noticeable to guests and to the hotel owner.

I haven't confirmed how often the job runs or whether it de-duplicates sends. That determines how bad this would be in practice.

## Changes

- `src/reminders.js`: replaced the 24-hour window check with a single "check-in is after now" filter. The code comment was updated to match.
- `test/reminders.test.js`: removed the test "ignores bookings further out". It was the only test that covered the 24-hour limit, so nothing now catches this change.

Net: 2 files, +2 / −12 lines.

## Recommendation

One of these before merging:

1. **Keep the 24-hour window.** Restore the upper bound and the removed test. The simplification can then be kept as a tidier version of the same logic. This is the safer option if "behaviour unchanged" was the intent.
2. **Make the change on purpose.** Confirm that reminders for all future bookings is wanted, then update the commit message and PR title, and tell the hotel owner's account manager before release.

## Testing

I did not run the tests or the app. This description comes from reading the git history and the diff only.
