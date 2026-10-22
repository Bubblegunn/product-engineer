# Simplify the reminder filter, but it now changes who gets reminders

**Purpose:** Explain what this branch changes in `dueReminders`, so reviewers can decide whether to merge it and the hotel owner's account manager can judge the effect on guests.
**Reader:** Code reviewers first. The account manager can stop after the Overview.
**Date:** 2026-10-22
**Branch:** `refactor/reminder-filter` into `main`

## Overview

The commit message says "behaviour unchanged". That is wrong. The change alters which bookings get a reminder.

- **Before:** a booking got a reminder only if check-in was within the next 24 hours.
- **After:** a booking gets a reminder if check-in is at any time in the future.
- **Guest impact:** every guest with a future booking would be eligible for the email "Your stay starts tomorrow". For a booking months away, that text is false.
- **Test impact:** the test that would have caught this was deleted in the same commit.

**Recommendation:** do not merge as it stands. Restore the 24-hour limit and the deleted test. If you want the simpler filter, first decide what the reminder rule should be.

## Where the reminder text appears

The reminder email says the stay "starts tomorrow" in both its subject and its body ([`src/mail.js:2`](src/mail.js#L2) and [`src/mail.js:6`](src/mail.js#L6)). That wording only holds if the filter limits reminders to the next 24 hours. This branch removes that limit.

## What changed in the code

The filter lives in `dueReminders` in [`src/reminders.js:1-6`](src/reminders.js#L1-L6). The table shows the rule before and after.

| Check-in time | Before | After |
|---------------|--------|-------|
| In the past | No reminder | No reminder |
| Within 24 hours | Reminder | Reminder |
| More than 24 hours away | No reminder | Reminder |

The code change removes the upper bound:

```js
// Before
const end = now.getTime() + 24 * 60 * 60 * 1000;
return bookings.filter((b) => {
  const start = new Date(b.checkIn).getTime();
  return start > now.getTime() && start <= end;
});

// After
return bookings.filter((b) => new Date(b.checkIn).getTime() > now.getTime());
```

The branch also rewrites the comment above the function to match the new rule.

## What changed in the tests

The commit deletes the test `ignores bookings further out` from [`test/reminders.test.js`](test/reminders.test.js). That test used a booking five days away and expected no reminder. It would fail against the new code. The remaining test only covers a booking inside 24 hours, so it passes either way.

I did not run the test suite for this description. I read the diff only.

## What to do before merging

1. **Choose the rule.** Decide whether reminders should still go out only in the final 24 hours.
2. **If yes,** restore the `end` limit in `dueReminders` and restore the deleted test.
3. **If no,** change the email text in `src/mail.js` so it no longer says "tomorrow", and add a test for the new rule.
4. **Fix the commit message.** Remove "behaviour unchanged".
5. **Tell the account manager** if the rule changes on purpose, because guests will see different emails.
