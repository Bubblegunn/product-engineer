Commit `b10758d` is done and nothing was pushed. Verify passed first.

```
═════════════════════════════════════════════════════════════
DoD-Guard verify  (project: checkout, runner: npm-test)
═════════════════════════════════════════════════════════════
[1/5] Snapshot
  - branch:        main
  - HEAD:          b68f241 (before commit)
  - dirty:         yes
  - changed files: 2 (src/discount.js, test/discount.test.js) + untracked scratch.log

[2/5] Stubs & incomplete code
  - 0 stub-style issue(s)
  - detect-stubs.sh: 0. detect-empty-functions.py: 0. Both scanned 2 files.

[3/5] Tests
  - runner: node (npm test)
  - 4 passed, 0 failed, 0 skipped (158 ms)
  - The runner JSON reported passed:0 because it failed to parse the node:test output. The raw output shows "pass 4, fail 0", and the exit code is 0.

[4/5] E2E probe
  - node -e: call applyDiscount(200,'SPRING15'), (200,'spring15') and (100,'NOPE')
  - exit_code: 0
  - evidence:  printed "170 170 100"

[5/5] Verdict
  ═══════════════════════════════════════════════════════════
  VERDICT: PASS
  ═══════════════════════════════════════════════════════════
```

Verify marker refreshed; you can now `git commit` within the TTL.

**Commit:** `feat(discount): add SPRING15 seasonal discount code (15% off)`
- The body says SPRING15 was added next to WELCOME10 and VIP20. It lists the two new tests (15% off, and case-insensitive lookup) and says `npm test` gave 4 passed.
- It also has the plain-language section from your CLAUDE.md, in Turkish. I left out the automation line because this change doesn't reduce manual work.
- The `Co-Authored-By` line is included.

**Things to know:**
- **Test file staging:** `test/discount.test.js` was modified but not staged, so I staged it. Without that, the commit would have had no tests.
- **`scratch.log` left out:** It is still untracked. It contains a note to ask Priya about expiry dates, so you may want to follow that up.
- **DOD.md items not covered:** The project-specific criterion is still a placeholder. No docs mention discount codes, so none changed. `applyDiscount` has no JSDoc, but I didn't change its signature.