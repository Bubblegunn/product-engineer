I rewrote the licence in plain language and saved it as `LICENCE-plain.txt`. `/dod:verify` passed.

Each side's duties are unchanged:
- **Payment:** the Licensee pays EUR 500 within 30 days of the Effective Date, and the Fee is non-refundable.
- **No transfer:** the Licensee can't assign or sublicense its rights without the Licensor's prior written consent.
- **Breach:** if a material breach isn't fixed within 15 days of written notice, the Licensor may end the licence immediately.
- **Confidentiality:** the Licensee keeps the Licensor's customers' booking data confidential for 12 months after termination, even though the licence has ended.

To make it readable, I called the two parties "you" (the Licensee, for example the hotel) and "we" (the Licensor). I also added a short heading and a line saying who "you" and "we" are. The original `LICENCE.txt` is untouched.

```
═════════════════════════════════════════════════════════════
DoD-Guard verify  (project: orders-api, runner: npm-test)
═════════════════════════════════════════════════════════════
[1/5] Snapshot
  - branch:        main
  - HEAD:          f555c4d
  - dirty:         yes (untracked: LICENCE.txt, LICENCE-plain.txt)
  - changed files: 0 tracked diffs, 2 untracked

[2/5] Stubs & incomplete code
  - 0 stub-style issue(s)
  - detect-stubs.sh and detect-empty-functions.py each scanned 5 files

[3/5] Tests
  - runner: npm-test
  - 6 passed, 0 failed, 0 skipped (357 ms)
  - The runner's summary JSON reported passed=0. Its raw output shows
    "pass 6 / fail 0" and exit_code 0, so I used the raw output.

[4/5] E2E probe
  - no probe applicable in this environment: the change is a plain-text
    document, with no code or endpoint behaviour to exercise
  - exit_code: n/a
  - evidence:  I compared the four clauses of LICENCE-plain.txt against
    LICENCE.txt by hand (figures, deadlines, consent and survival terms)

[5/5] Verdict
  ═══════════════════════════════════════════════════════════
  VERDICT: PASS
  ═══════════════════════════════════════════════════════════
```

I wrote the verify marker to `.dod-guard/last-verify-passed`, so you can now `git commit` within the TTL. I haven't committed anything.

`DOD.md` still has an unfilled placeholder under its project-specific criteria. This task didn't touch it.