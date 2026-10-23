The stop gate was right, and my earlier verify was incomplete. I ran only the stub and empty-function detectors and skipped the suspicious-returns one.

**What it flagged:** the loader in the "after 61 seconds it loads again" test in `test/list.test.js` returned `[]`. The detector treats a loader that only returns empty values as suspicious. It was a test fixture, not a real stub.

**Fix:** the loader now returns `[{ id: loads }]`. The detector reports 0 issues, 7 of 7 tests pass, and `stop-gate.sh` exits 0.

**Commits:** the cache change is `0bc60f9`, and the fix is a separate commit, `45b8f5a`, so I didn't rewrite the first one. The working tree is clean.

**Still open from before:**
- The cache can serve data up to 60 seconds old.
- `DOD.md` asks for JSDoc on public functions and for docs to be updated. I haven't done either.