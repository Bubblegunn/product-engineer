# Simplify the reminder filter (changes which bookings get a reminder)

For the customer:
What changed: The reminder filter now picks every booking whose check-in is still in the future. Before, it picked only bookings checking in within the next 24 hours. If reminders are sent from this filter, guests could get a reminder for a stay weeks or months away, and could get it again each time the filter runs.
Why it matters: Guests and hotel staff expect a reminder the day before arrival, not at booking time. This needs a decision before it ships (see below).

## What the code does

- `src/reminders.js`: `dueReminders` no longer computes the 24-hour cutoff. It keeps any booking with `checkIn` after `now`.
- `test/reminders.test.js`: removed the test "ignores bookings further out". It was the only test that covered the 24-hour limit.

## This is not a pure refactor

The commit message says "behaviour unchanged", but the behaviour does change. A booking checking in on 2026-10-25, checked on 2026-10-20, was excluded before and is included now. The test that would have caught this was deleted in the same change.

I found no caller of `dueReminders` in this repository, so I could not check whether anything sends mail from it today. If a scheduled job outside this repo does, the effect above is live as soon as this merges.

## Suggested resolution (for the author to decide)

Restore the 24-hour upper bound and the "ignores bookings further out" test. The code is then a no-op change and the PR can be called a refactor. If wider reminders are intended, say so in the title, keep a test for the new rule, and tell the hotel owner's account manager before release.

## Checked

- `npm test`: 4 passed, 0 failed. This passes because the only remaining reminder test uses a booking inside 24 hours. It does not show the behaviour is unchanged.
- Not checked: any real reminder send, since no caller exists in this repo.
