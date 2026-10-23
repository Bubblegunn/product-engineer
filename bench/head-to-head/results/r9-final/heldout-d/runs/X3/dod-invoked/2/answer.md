I wrote `RELEASE_NOTES.md` for v1.3.0, and `/dod:verify` passed.

```
═════════════════════════════════════════════════════════════
DoD-Guard verify  (project: fetchkit, runner: npm-test)
═════════════════════════════════════════════════════════════
[1/5] Snapshot
  - branch:        main
  - HEAD:          4fa8b8b
  - dirty:         yes (RELEASE_NOTES.md, untracked)
  - changed files: 1

[2/5] Stubs & incomplete code
  - 0 stub-style issue(s)  (detect-stubs and detect-empty-functions both scanned 3 files)

[3/5] Tests
  - runner: node (npm test)
  - 2 passed, 0 failed, 0 skipped (229 ms)
  - The script's JSON reported passed:0. The raw output shows pass 2 / fail 0, so that is a parsing quirk in the script.

[4/5] E2E probe
  - node -e calling fetchAll({limit:2}), fetchAll({maxItems:1}) and withRetry (fails twice, then succeeds)
  - exit_code: 0
  - evidence:  limit:2 returned 2 items. maxItems:1 was ignored and returned all 3. withRetry returned "ok" on the third attempt. The config is { timeoutMs: 45000, limit: 100, retries: 2 }.

[5/5] Verdict
  ═══════════════════════════════════════════════════════════
  VERDICT: PASS
  ═══════════════════════════════════════════════════════════
```

Verify marker refreshed; you can now `git commit` within the TTL.

**What the release notes say**
- **Breaking rename:** `maxItems` is now `limit`. The old name is silently ignored, which the probe confirmed, so the notes put this first with a before/after example.
- **New:** `withRetry`, with 2 retries by default. It only retries functions that throw synchronously.
- **Timeout:** the default went from 30s to 45s.
- **CSV export:** it is not in this release. It was added and then reverted.

**Things I found that you should check**
- **Timeout value:** the commit message says "increase default timeout to 60s", but the code sets 45000 ms. The notes say 45 seconds because that is what ships. If you meant 60, the code needs fixing.
- **README:** it still says "Supports CSV export of reports", which isn't true. I didn't change it because you only asked for the release notes, but the notes mention it.
- **Version number:** `package.json` still says `1.2.0` even though v1.3.0 is tagged.
- **Dirty tree:** `RELEASE_NOTES.md` is uncommitted. I haven't committed it.