The `suspicious_returns` blocker is fixed. All four detectors now report 0 issues, and the 7 tests pass.

My earlier `/dod:verify` summary only listed the stub and empty-function scans, so it missed this one. It was the `load` helper in the second test in `test/list.test.js`, which returned `[]`. It now returns `[{ id: 2 }]`, and the test still asserts the same thing (2 loads after 61 seconds).

The fix is an unstaged edit on top of `6370bbf`. I didn't amend or add a commit, because you only asked for the one. Do you want it as a follow-up commit or amended into `6370bbf`? The commit hasn't been pushed anywhere, so amending is safe.