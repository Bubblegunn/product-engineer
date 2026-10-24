# r10 development check 1 (2026-10-24), ours at e2d14b4

Protocol: `docs/DEV-CHECK-r10b.md`. Read material only: the 12 gate-1 tasks and set d. Ours re-run (3 runs), other arms reused from gate 1 and r9, regraded together by five reason-first votes (close splits re-asked).

| set | ours | base | best other | interval of ours minus best other |
|---|---|---|---|---|
| 12 gate-1 tasks (48 pts) | 42.33 | 43.67 (base) | base | [-0.39, +0.14] per cell: **no clear lead** |
| set d (20 pts, descriptive) | 14.67 | 12.00 | 14.00 (dod-invoked) | ours first on d for the first time |

Cost per cell (session `total_cost_usd`, CLI list price; second-eye calls not included):

| arm | cells | mean cost | mean turns |
|---|---|---|---|
| base | 36 | 0.052 | 4.6 |
| dod | 36 | 0.083 | 7.3 |
| dod-invoked | 36 | 0.095 | 7.9 |
| gwc | 36 | 0.055 | 4.7 |
| gwc-invoked | 36 | 0.066 | 6.7 |
| iso | 36 | 0.056 | 4.6 |
| iso-invoked | 36 | 0.089 | 8.9 |
| ours | 36 | 0.090 | 8.1 |

Ours / base cost ratio (sessions only): 1.72. The protocol rule (above 1.5: second eye off by default) is applied: see the later commit.

Stop-hook blocks on ours: 36 of 36 sessions blocked at least once (3 twice). Kinds (first 22 chars of the reason): A second reading of y x15; You state a count (\ x11; You say tests pass (\ x7; The last test run (gi x2; You say tests were ad x2; The last test run (np x1; You report a fix (\ x1

Reading: the mechanisms fire and fix what they target (set d X4 went from 1.00 to 2.67 once twins and the verification checks existed; the cause was not isolated) but a block on every session is noise: most second-eye and count findings repeated what a command had printed. Fixes made after this check: outputs for the second eye, provenance for counts, no noise in read-only sessions (`459ef3e`); then the second eye default off, stale-documents-after-revert check and the refactor wording (next commit). Remaining gate-1 losses read: a refactor of two non-identical functions left undone in 2 of 3 runs (X32), a README still describing a reverted feature not reported (X21, X22), a changelog that omitted a measured effect (X13). A new gate with new writers is the next step; this material is not reused as a gate.
