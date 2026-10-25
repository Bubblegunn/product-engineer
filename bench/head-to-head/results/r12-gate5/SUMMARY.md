# r12 development gate 5 (2026-10-25): I1 does not hold

Protocol `docs/DEV-GATE-r12.md` (frozen `b1a38595`, before any session). Ours at `e16363fa` (gate 4 product plus one rule: when a request's premise is off, do the part that can be undone and ask only before the irreversible). 12 tasks of three NEW writers (W14 wording hides a wrinkle, W15 explaining the state of the work, W16 changes applied consistently), unread by the controller; 8 arms x 3 runs = 288 sessions, no limit or auth error; five reason-first votes, 12 close splits re-asked with seeds 6 and 7. The job descriptions were written after the final's losses were read (disclosed in the protocol).

| | ours | base | dod | dod-inv | gwc | gwc-inv | iso | iso-inv | max |
|---|---|---|---|---|---|---|---|---|---|
| total (12 tasks) | **38.00** | 33.67 | 35.67 | 31.67 | 34.33 | 36.33 | 35.67 | 36.33 | 48 |

Best other arm: gwc-invoked (36.33). Ours minus best other, 36 paired cells: mean +0.14, 95% interval [-0.19, +0.47]. **Pass rule I1: does not hold.** Ours has the highest total (1.67 above the best other, 4.33 above base) but the interval includes zero. Cost 1.46 times base (0.1038 against 0.0712 USD per session); the Stop hook blocked 4 of 36 ours sessions.

Pooled over the three sets of new writers (gate 4, the final, gate 5; 30 tasks, 120 points; descriptive, not a frozen test): ours 98.66, gwc-invoked 90.66, iso-invoked 89.67, iso 88.34, base 84.67, dod 78.33, gwc 83.0 (gate 4 30.67 + final 18.00 + gate 5 34.33 = 83.00), dod-invoked 75.0 (26.67 + 16.67 + 31.67 = 75.01).

Read now (this set is development material): ours loses X174 (default page size 20 to 50: in 2 of 3 runs search.js was "deliberately left" at 20 and its test, the openapi default, README and CHANGELOG were not updated; dod 4.00 against ours 1.67), X172 (Node 18 to 22: the CI matrix, `MIN_MAJOR`, `engines` or README left behind; 1.33), X162 (a Turkish upgrade note: the note starts with the English line "Changes since v1.2.0" and an English "Not in this release" heading in 3 of 3 runs, so the deliverable is not entirely Turkish; this comes from the release-notes skill's fixed English shape) and X171 (a missing CHANGELOG line for a breaking change in 2 of 3 runs). Ours leads X152, X154, X161, X164.
