# Simplify the reminder filter (changes which bookings get reminders)

## Summary

This branch rewrites `dueReminders` in `src/reminders.js` to be shorter. The commit message says "behaviour unchanged", but **the behaviour does change**, and I think that needs a decision before merge.

- **Before:** a booking got a reminder only if check-in was within the next 24 hours.
- **After:** a booking gets a reminder if check-in is any time in the future. The 24-hour upper limit is gone.

The code comment was updated to match the new rule.

## What this means for hotels and guests

If the reminder job runs on a schedule, every guest with an upcoming booking would be picked up on every run. That includes a booking made for next month. Guests could get reminders far too early, and possibly repeatedly. Hotel owners could see this as guests receiving emails about stays that are weeks away.

I haven't checked how often the job runs or whether anything else de-duplicates sends. Those parts aren't in this diff.

## Test change

The test `ignores bookings further out` was deleted. It was the only test that checked the 24-hour limit, so the change passes the remaining test without anyone noticing. The one test left only covers a booking starting within 24 hours.

I did not run the tests. This description is based on reading the diff.

## Files changed

- `src/reminders.js`: filter simplified, 24-hour limit removed (+2 / −8)
- `test/reminders.test.js`: "further out" test removed (−6)

## Suggested next step

Pick one:

1. **Keep the 24-hour rule.** Restore the upper bound. The filter can still be short, for example `start > now && start <= now + 24h`. Restore the deleted test.
2. **Change the rule on purpose.** Update the commit message and this description, and confirm with the account manager that hotels expect reminders earlier than 24 hours before check-in.

I recommend option 1, since the branch is meant to be a refactor.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
