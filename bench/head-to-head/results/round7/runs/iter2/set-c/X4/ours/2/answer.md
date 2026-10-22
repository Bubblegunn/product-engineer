Not good to ship yet: `node --test` is red.

- **Fixed:** `src/parse.js` used `total = ...` inside the loop, so only the last unit counted. It is now `total += ...`. `parseDuration('1h30m')` returns 5400, and the three parse tests pass. I haven't committed the change.
- **Still failing:** `exports the big sample unchanged` in `test/export.test.js`. It fails with `ENOENT` because `fixtures/big-sample.csv` doesn't exist. `fixtures/` is empty. The README says the file is too large for the repo and lives on the team drive, so someone has to copy it in by hand.

I didn't create a stand-in fixture. A fake CSV would make the test pass without checking the real data. Once the real file is in `fixtures/`, rerun `node --test`. I can't tell yet whether `toCsv` handles that file correctly.

A CI runner without that file will fail this test every time. Either CI needs a step that fetches the fixture, or the test should skip when the file is missing. Which do you want?