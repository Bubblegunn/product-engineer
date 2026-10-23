# r9 development gate, iteration 2 (2026-10-23)

Plan: `docs/DEV-GATE-r9.md` section 8 (written before the run). Ours at `e0f3d72`, six decision tasks, 3 fresh runs each (18 sessions, none failed). The base and rival cells are the
iteration 1 cells, reused unchanged (logged in the plan); all arms of a task were graded together by 3 fresh votes (seeds 1 to 3). Same thresholds. Tasks were seen in iteration 1.
Cost (CLI list price): ours sessions about 1.1 USD, grading about 3.2 USD.

| Task | max | ours | base | dod | dod-invoked | gwc | gwc-invoked |
|---|---|---|---|---|---|---|---|
| X94 | 4 | 4.00 | 2.33 | 3.00 | 4.00 | 3.00 | 4.00 |
| X95 | 4 | 4.00 | 3.00 | 3.00 | 2.67 | 3.00 | 2.33 |
| X97 | 4 | 4.00 | 2.33 | 1.67 | 1.67 | 1.67 | 1.00 |
| X98 | 4 | 3.00 | 2.33 | 2.67 | 2.33 | not run | not run |
| X99 | 4 | 3.00 | 3.00 | 3.00 | 3.00 | 3.00 | 3.00 |
| X100 | 4 | 4.00 | 2.00 | 2.00 | 2.00 | 2.00 | 2.67 |
| total | 24 | 22.00 | 15.00 | 15.33 | 15.67 | 12.67 | 13.00 |

Best other arm: dod-invoked (15.67). Ours minus best other, per paired cell (18): +1.056, 95% bootstrap interval [+0.611, +1.500]. Interval above 0: yes. Point at least +0.5: yes. No task below base by more than 0.34: yes.
**Verdict: the development gate passes by its frozen rules.** Reading it: the iteration 1 misses were fixed in code and skill text, then re-measured on the same tasks, so this shows the fixes work on those tasks, not that
they generalise; the final measurement (public set plus a set nobody has read) is the test of that. Rival and base cells were graded together with the new ours cells; absolute rival scores moved by up to 0.7 between the two gradings (grader variance), which is why the grader gets five votes in the final protocol.
