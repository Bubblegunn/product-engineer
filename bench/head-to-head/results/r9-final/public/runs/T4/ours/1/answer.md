I wrote the release notes to `RELEASE_NOTES.md`. The notes checker passes, and the project tests pass.

I ran `npm test` just now and it printed `ℹ tests 5`, `ℹ pass 5`, `ℹ fail 0`. The checker printed `notes: ok (0 warnings)`. My earlier message called the checker result a pass without running the tests, so this is the first time I've actually run them. These tests don't cover the notes file, and none of them look aimed at the pagination, rounding or CSV escaping changes. Passing says nothing about whether those changes work. I haven't run the app, so I haven't seen any of them work in practice.

The notes cover everything since v1.4.0:
- **Bookings list:** it now shows 50 bookings at a time.
- **Reminders:** cancelled bookings no longer get the day-before reminder.
- **Spreadsheet export:** exported files can no longer run commands when opened. The note says what this protects and nothing about how to abuse it.
- **Stay totals:** totals are now rounded to cents. This comes from a commit titled as a refactor, but I read the diff and it changes the amount a guest sees, so I wrote it as a customer-facing change.
- **Not in this release:** the bulk cancel button was added and then reverted, so it isn't announced as available. I listed it so owners who saw it mentioned don't expect it.

I left out the version bump, since you didn't give me a new version name. I also left out the README commit, which documents bulk cancel. The README still describes bulk cancel even though the feature was reverted. That's worth fixing separately, and I haven't touched it.

I wrote no speed claim for the paginated list, because nothing in the range measures it.

My first checker run used `--range v1.4.0` and printed the help text instead of a result, so I re-ran it without that flag. The range cross-check came from `product-engineer range v1.4.0`, which I ran before writing.