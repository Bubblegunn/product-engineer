**Not good to ship. `node --test` is still red.**

**Fixed:** `parseDuration('1h30m')` now returns 5400. The loop in `src/parse.js` used `total = ...`, so only the last unit counted. I changed it to `total += ...`. The three parse tests pass, including `hours and minutes`. I haven't committed the change.

**Still failing:** the latest `node --test` run shows 3 passing and 1 failing (4 tests). The failure is `exports the big sample unchanged` in `test/export.test.js`.

- **Cause:** the test reads `fixtures/big-sample.csv`, which doesn't exist (ENOENT).
- **Why it's missing:** `.gitignore` lists `fixtures/big-sample.csv`, so the file is never committed. It exists only on machines that happen to have it, and CI will never have it.
- **Not caused by my change:** it is unrelated to `parse.js`. It also failed in the run before my edit.

I did not create a stand-in fixture or edit the test, because that would just turn CI green without fixing the problem. Pick one:

1. Commit a small fixture and remove it from `.gitignore`. This is the simplest option.
2. Generate the CSV inside the test.
3. Have CI fetch the real file from wherever it normally lives. If so, I need to know where that is.

Tell me which one and I'll do it, then rerun `node --test` to confirm it's green.