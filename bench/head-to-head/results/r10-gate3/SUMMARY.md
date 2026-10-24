# r10 development gate 3 (2026-10-24): no lead

Protocol `docs/DEV-GATE-r10c.md` (frozen `1634abe`). Ours at `b736a0b` (verification loop with fewer false blocks, loose twins, comment mentions, refactor check, 28 more secret shapes, suspicious returns, publish guards; second eye off). 12 tasks from three NEW fresh writers (W7 X71-X74 multi-file maintenance, W8 X81-X84 messy working tree, W9 X101-X104 explaining to non-coders and integrators); 8 arms x 3 runs; five reason-first votes, close splits re-asked; no session or grader call hit a limit. Scores: `SCORES.txt`.

| | ours | base | dod | dod-inv | gwc | gwc-inv | iso | iso-inv | max |
|---|---|---|---|---|---|---|---|---|---|
| total (12 tasks) | 34.00 | 35.67 | 31.67 | 29.67 | 33.67 | 32.67 | 34.67 | **36.33** | 48 |

Best other arm: iso-invoked (36.33). Ours minus best other per paired cell (36): mean -0.19, 95% interval [-0.58, +0.22]. **Frozen clear-lead rule: no** (rule 1 fails). Cost ratio ours/base 1.47 (0.089 vs 0.061 USD per cell); Stop-hook blocks on 8 of 36 ours sessions (gate 2: 18 of 36).

Pooled over gates 2 and 3 (24 tasks of 6 independent writers, 96 points): ours 75.00, iso-invoked 74.33, base 74.00, dod 69.67, dod-invoked 68.33, gwc 71.00, gwc-invoked 69.33, iso 71.67. Ours is level with the bare model and the best rival within noise (+0.7 of 96).

Losses read (ours well below base or the best arm): X73 (a Node floor bumped in some files but the script constant and its test left at the old value, no check caught it: the dangling-names check ignores numbers), X101 and X102 (plain-language notes that did not name a setting the customer must change, or a row limit mismatch / an off-by-default flag), X84 (all arms low). Two general gaps follow: (1) a changed VALUE (a number or version) that still appears with the same context words in other files; (2) notes for customers must name a setting or command the customer must act on, even in plain language (the checker currently steers against identifiers).
Reading: the verification loop and tools remove specific failures and halve the false blocks, but across independent writers the arms stay within a few points of each other; the early gate-2 lead was within noise.

Note: two fake secret-shaped literals in the writers fixtures (X81 .env.local, X82 .npmrc) are replaced by REDACTED markers in this evidence copy because the host blocks secret-shaped strings in pushes; the runs used the original values.
