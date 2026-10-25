# r11 final measurement (2026-10-25): I1 does not hold

Protocol `docs/FINAL-PROTOCOL-r11.md` (frozen `2fc53a46`, before the first session). Ours `bbe8673c` (the product of gate 4, unchanged). Sealed set of a new writer, W13: 6 tasks X141 to X146 (24 outcome criteria), unread by the controller until graded (content hash `2e0c240230093be0`). 8 arms x 3 runs = 144 sessions, no limit or auth error, none set aside; five reason-first votes, 11 close splits re-asked with seeds 6 and 7. Scores: `SCORES.txt`.

| | ours | base | dod | dod-inv | gwc | gwc-inv | iso | iso-inv | max |
|---|---|---|---|---|---|---|---|---|---|
| total (6 tasks) | 19.33 | 18.33 | 14.33 | 16.67 | 18.00 | 19.00 | **19.67** | 18.67 | 24 |

Best other arm: iso (19.67). Ours minus best other, 18 paired cells: mean -0.06, 95% interval [-0.61, +0.44]. **Claim I1 (first in total): does not hold.** Rule A fails (ours lost 4.67 against 4.33), Rules B and B' fail (X142, X143, X146). Ours is third by total, 0.33 behind iso, 0.33 ahead of gwc-invoked, 1.0 ahead of base. Mean session cost 0.0893 USD against 0.0629 for base (1.42 times); the Stop hook blocked 3 of 18 ours sessions.

F6-grader: PASS (15 of 15 sampled cells re-graded by three fresh grader sessions, 100.0% criterion agreement over 60 criteria, largest cell difference 0 points; `F6-GRADER.txt`). The grading is reproducible, so the result stands. F6-runs and F9 were not run: the claim failed, and they are descriptive. The public 13-task set was not re-run (stated in the protocol).

Where ours lost: X146 (cut a release; the premise "last release was 1.4.0" is wrong because 1.4.1 exists on a release branch): ours 1.00 against 3.67 for dod-invoked; in all three runs ours found the 1.4.1 tag, told the user, changed nothing and asked which of two ways to proceed, so the version bump, the changelog and the tag were not done (3 criteria 0/3). Base did the same in 2 of 3 runs; dod-invoked did the release and reported the gap. X143 (German status for a customer): ours 3.00 against 3.67 for base; ours did not name ROADMAP.md as a wrongly "shipped" signal in two runs, and one run called the export "technically finished". X142: one run left `scripts/release.sh` calling the removed flag.
Over the sealed set ours leads on X141, X144 and X145 and ties X142 with base.
Limits: 6 tasks, 18 cells per arm pair, one writer; the interval is wide, so this result also does not show that ours is behind. It is the pre-registered test and it did not pass.
