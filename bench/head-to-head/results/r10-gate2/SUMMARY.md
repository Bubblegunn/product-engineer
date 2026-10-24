# r10 development gate 2 (2026-10-24): I1 holds, the frozen clear-lead rule does not

Protocol `docs/DEV-GATE-r10b.md` (frozen `dccbab9`). Ours at `d9e2336` (second eye off by default). 12 tasks from three NEW fresh writers (W4 X41-X44, W5 X51-X54, W6 X61-X64); 8 arms x 3 runs, Sonnet, subscription path, five reason-first votes, close splits re-asked (seeds 6 and 7). No session or grader call hit a limit. Scores: `SCORES.txt`.

| | ours | base | dod | dod-inv | gwc | gwc-inv | iso | iso-inv | max |
|---|---|---|---|---|---|---|---|---|---|
| total (12 tasks) | **41.00** | 38.33 | 38.00 | 38.67 | 37.33 | 36.67 | 37.00 | 38.00 | 48 |

Best other arm: dod-invoked (38.67). Ours minus best other per paired cell (36): mean +0.19, 95% interval [+0.03, +0.36]: **claim I1 holds on this set** (thin: lower bound 0.03). Rule A passes (ours lost 7.00, best other 9.33). Rule B fails on 6 tasks, all ties below the ceiling; ours is never below base on any task.

Frozen clear-lead rule (all five required):
1. interval lower bound above 0: yes (+0.03).
2. point estimate at least +0.5 per cell: **no** (+0.19).
3. ours at least the best other in each writer's set: W4 13.33 vs 13.00 yes, W6 15.00 vs 14.00 yes, W5 12.67 vs 13.00 (iso-invoked) **no**.
4. never more than 0.67 below base on a task: yes (worst +0.00).
5. cost ratio ours/base at most 1.5: yes, **1.44** (0.104 vs 0.073 USD per cell, list price; second eye off; 18 of 36 sessions blocked once or twice by the verification loop; turns 8.6 vs 5.9).
**Verdict by the frozen rule: no clear lead** (rules 2 and 3 fail). Thresholds were not changed.

Reading: on tasks nobody on this project wrote or read, ours is first by 2.3 points of 48 (85 percent against 81 percent for the best rival and 80 percent for the bare model), the first lead of the project on fresh tasks, statistically positive but small; the gap to the bare model (+2.67) is about as large as the one to the best rival. Per-task gains: X62 (long-history period report), X61, X41; W5 (doing work and reporting) is a tie.
Mechanisms and cost: the verification loop fires on about half of the sessions; sessions cost 1.44 times the bare model.
