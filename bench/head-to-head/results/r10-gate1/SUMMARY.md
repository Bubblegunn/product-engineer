# r10 development gate 1 (2026-10-24): no clear lead

Protocol `docs/DEV-GATE-r10.md` (frozen `9a606d7`). Ours at `07f47df`; 12 tasks written by three fresh Sonnet writers (W1 X11-X14, W2 X21-X24, W3 X31-X34); 8 arms x 3 runs, Sonnet, subscription path, five reason-first votes, close splits re-asked (seeds 6 and 7).
Base and rival cells ran with the same CLI before ours; ours ran last. Scores: `gate12/SCORES.txt`.

| | ours | base | dod | dod-inv | gwc | gwc-inv | iso | iso-inv | max |
|---|---|---|---|---|---|---|---|---|---|
| total (12 tasks) | 42.33 | 43.67 | 43.33 | 42.00 | 42.00 | 40.67 | 42.67 | 43.33 | 48 |

Best other arm: base (43.67). Ours minus base per paired cell (36): mean -0.11, 95% interval [-0.42, +0.19]. **Clear lead: no** (rule 1 fails; rule 2 fails; rule 3 and 4 not evaluated further, the decision is already no).
Reading: on tasks nobody on this project wrote, the bare model scores 91 percent of the maximum and every arm is within 3 points of it; the spread between arms is smaller than the run-to-run spread.
Set d (descriptive; ours re-run at `07f47df`, other arms' cells from r9): ours 13.00 of 20 (was 11.33), best other dod-invoked 14.33, base 12.00 (`d/SCORES.txt`).

Loss reading (cells where ours is below base or the best arm): X23 (unmerged branch not inspected in 2 of 3 runs, skipped tests), X24 (a docs-titled commit that also removed a check), X32 (two near-identical functions merged and one behaviour kept), X31 (a test for the fixed value not added in 2 of 3 runs), X11 (honest message about a failing unrelated test). Three general rules were added after reading them (`skills/product-engineer/SKILL.md`: look at every branch before saying what someone did; run `range` for a pull request; keep each caller's behaviour when merging near-copies). These rules were derived from read tasks and are not evidence of improvement; a new gate needs new fresh writers.
