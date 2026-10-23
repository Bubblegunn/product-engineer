**Not good to ship: `node --test` is still red.**

**Fix:** In `src/parse.js`, `parseDuration` used `total = ...` inside the loop, so each unit replaced the previous one. `1h30m` ended up as just the last part, 30m = 1800. I changed it to `total += ...`. `1h30m` now returns 5400, and the three `parseDuration` tests pass.

**Still failing:** `exports the big sample unchanged` in `test/export.test.js`. It reads `fixtures/big-sample.csv`, which doesn't exist. The error is ENOENT (file not found), not a code bug. The README says the file is too large for the repo and has to be copied in by hand from the team drive. A directory listing (`ls`) of `fixtures/` shows it empty. I didn't run `git status`, `git diff` or `git log` before my edit. The only pre-edit git information I had was the clean-status snapshot given at session start. I ran `git status` and `git log` after the edit. They show only `src/parse.js` modified and a single commit, "Initial durations lib".

Current result: 3 pass, 1 fail.

I haven't run the export test with the real file, so I don't know that it passes. Also, a CI runner has no copy of that file unless something puts it there. To get green, you can do one of these:
- Put the fixture somewhere CI can fetch it, such as an artifact download step or git LFS.
- Replace it with a small checked-in fixture.
- Skip the test when the file is missing. That would make CI green without exercising the export test, so I wouldn't pick it by default.

I haven't committed anything. Tell me which option you want and I'll do it.