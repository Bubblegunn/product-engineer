# Simplify the reminder filter (`dueReminders`)

## ⚠️ Read this first: this change is NOT behaviour-neutral

The commit message says "behaviour unchanged". That is not accurate. The simplification removed the 24-hour upper limit on reminders.

| | Before | After this branch |
|---|---|---|
| Who gets a reminder | Bookings whose check-in is within the next 24 hours | **Every booking whose check-in is in the future, however far away** |

Example (checked by running the function): with "now" = 20 Oct 12:00 and a booking checking in on 25 Oct, the old code returned no reminder. This branch returns that booking.

## What this means for hotels and guests

If `dueReminders` runs on a schedule, guests could get reminder emails for stays days or months away. They could also get them repeatedly on each run. Hotel owners may see guests confused by early reminders, or unsubscribing. Please don't roll this out to hotel partners as it stands.

## What changed

- `src/reminders.js`: the filter is now a single line that only checks that check-in is after now. The 24-hour cutoff is gone. The comment was updated to match.
- `test/reminders.test.js`: the test `ignores bookings further out` was **deleted**. It was the only test that covered the 24-hour limit, which is why the suite still passes.

## Recommended fix before merge

1. Restore the upper bound (`start <= now + 24h`). Keeping the shorter code is fine, as long as it keeps the cutoff.
2. Restore the `ignores bookings further out` test.

If the intent really is to remind for all future bookings, that is a product decision. It should be a separate, clearly labelled change agreed with the account team, not a refactor.

## Verification (DoD-Guard `/dod:verify`)

| Check | Command | Result |
|---|---|---|
| Stub / empty-function scan | `detect-stubs.sh --all --json`, `detect-empty-functions.py . --json` | 0 issues |
| Tests | `npm test` (`node --test`) | 4 passed, 0 failed, exit 0 |
| Behaviour probe | `dueReminders([{checkIn:'2026-10-25T09:00:00Z'}], new Date('2026-10-20T12:00:00Z'))` | returns `[2]`, expected `[]` (**regression**) |

Overall verdict: **FAIL**. The tests are green only because the test that would have caught this was removed.
