# Tidy the code layout; one stay-total calculation also changes

For the customer:
What changed: Almost everything here is a tidy-up of how the code is laid out. Reminder emails, the bookings list and the CSV export of bookings read and behave exactly as before. One exception: the stay total (nightly rate times number of nights) is now cut down to whole cents, never rounded up, so a total such as 100.456 becomes 100.45.
Why it matters: Hotel staff and guests see no difference in emails, lists or exports. The stay total is the one place where an amount can now differ by up to one cent from before, so the account manager should know about it before this goes out.

## What is in this branch

One commit, "style: format the code, no functional change", touching 6 files (counted with `git diff main...HEAD --stat`).

- Formatting only: the README, the CSV export, the bookings list, the reminder email text and the reminder tests. Lines were split and quotes unified; the wording of the reminder email is unchanged.
- **Not formatting:** `src/pricing.js`. `rate * nights` became `Math.floor(rate * nights * 100) / 100`. This contradicts the commit message ("no functional change").

## Things to decide before merging

- Whether the cent-cutting is wanted. If not, restore the original line in `src/pricing.js` and this becomes a pure formatting change. If yes, it should be its own commit with its own test and a correct message. No test covers it today.
- Nothing in the current code calls the stay-total function, so no booking, email or export on this branch is affected today. I searched the source and tests only; I did not check anything outside this repository.

## What I checked

- Ran `npm test`: 5 passed, 0 failed.
- Those tests cover only the reminder timing. Nothing tests the email wording, the CSV export, the list or the stay total, so "same output as before" for those rests on reading the diff, not on a test.
- Not run: the app itself, a real email send, a real CSV export.
