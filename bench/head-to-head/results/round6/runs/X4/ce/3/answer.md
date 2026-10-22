**Not good to ship. `node --test` is still red.**

**Fixed:** `parseDuration` in `src/parse.js:6` used `total =` where it needed `total +=`. Each unit overwrote the previous one, so only the last unit counted. `'1h30m'` now returns 5400, and all three `parse` tests pass.

**Still failing:** `test/export.test.js` ("exports the big sample unchanged"). It fails with `ENOENT` because `fixtures/big-sample.csv` doesn't exist.
- `.gitignore:1` ignores that file, so it was never committed and isn't in a fresh checkout.
- The failure is unrelated to my change. It was already failing before the fix.
- CI will hit the same error, because the fixture won't be there.

I haven't touched this. Each option below changes what the test covers, so it's your decision:
1. Commit a small fixture and remove it from `.gitignore`.
2. Have the test generate its own data.
3. Keep the file ignored and have CI fetch or generate it before the tests run.

Tell me which one you want and I'll do it. I haven't committed anything.