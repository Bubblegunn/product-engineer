# r9 final measurement (2026-10-23)

**Scoped result.** On the 13 public tasks, ours scores 62.33 of 63 outcome points against 48.33 for the best other arm (iso-invoked): claim I1 holds there (95% bootstrap interval of the difference per task-run cell [+0.79, +1.36], 39 paired cells), and Rules A, B and B' all pass.
On the held-out set d (5 tasks, 20 outcome points), ours scores 11.33 against 13.67 for the best other arm (dod-invoked): claim I1 does **not** hold (interval [-0.93, 0.00]), Rule A, B and B' fail. The launch claim "first in total in each set" is therefore **not supported** by this measurement.
Model `claude-sonnet-5-5`, Claude Code 2.1.308, subscription path (`sub-shim`), 8 arms, 3 runs per cell, 2026-10-23.

Protocol: `docs/FINAL-PROTOCOL-r9.md`, frozen in commit `5b4dcf5` before any session, with amendments A1 (grading method restated, `9cbf21a`) and A2 (table-only Rule B fix, `e686e4c`). Product under test: `e0f3d720b0e38d23b21541cedc965e373a5f7f49`.

## Public set (13 tasks, 312 sessions)

| Task | ours | base | dod | dod-inv | gwc | gwc-inv | iso | iso-inv | max |
|---|---|---|---|---|---|---|---|---|---|
| H1 | 5.00 | 5.00 | 5.00 | 5.00 | 5.00 | 5.00 | 5.00 | 5.00 | 5 |
| H2 | 5.00 | 4.33 | 5.00 | 5.00 | 5.00 | 4.67 | 5.00 | 5.00 | 5 |
| H3 | 5.00 | 2.00 | 2.33 | 3.00 | 2.00 | 2.67 | 2.00 | 3.00 | 5 |
| H4 | 5.00 | 5.00 | 5.00 | 5.00 | 5.00 | 4.67 | 5.00 | 5.00 | 5 |
| H5 | 5.00 | 2.00 | 2.00 | 2.00 | 2.00 | 2.33 | 2.33 | 2.00 | 5 |
| H6 | 5.00 | 5.00 | 5.00 | 5.00 | 5.00 | 5.00 | 4.00 | 4.00 | 5 |
| H7 | 5.00 | 4.00 | 4.67 | 3.67 | 4.00 | 3.33 | 5.00 | 4.33 | 5 |
| T1 | 5.00 | 3.00 | 3.00 | 3.00 | 3.00 | 3.00 | 3.00 | 3.00 | 5 |
| T2 | 4.00 | 3.33 | 3.00 | 3.00 | 3.00 | 4.00 | 3.00 | 3.33 | 4 |
| T3 | 5.00 | 5.00 | 5.00 | 5.00 | 5.00 | 5.00 | 4.67 | 4.33 | 5 |
| T4 | 4.00 | 2.67 | 2.00 | 2.00 | 2.00 | 2.00 | 2.33 | 2.33 | 4 |
| T5 | 5.00 | 3.00 | 3.00 | 2.33 | 4.00 | 3.67 | 3.67 | 4.00 | 5 |
| T6 | 4.33 | 3.00 | 3.00 | 3.00 | 2.67 | 3.00 | 3.00 | 3.00 | 5 |
| total | 62.33 | 47.33 | 48.00 | 47.00 | 47.67 | 48.33 | 48.00 | 48.33 | 63 |

Rule A: ours lost 0.67, best other (iso-invoked) lost 14.67; limit 0.8 x 14.67 = 11.73: pass. Rule B: pass on every task (ties are at the task maximum). Rule B': pass.
I1: mean difference 1.08 per task-run cell, 95% interval [0.79, 1.36]: holds.
**How to read it.** The 13 public tasks were available during development (rounds 1 to 6 and the r9 fixes were written against what they showed); this is the result on tasks the product was built against, not a generalisation test. The held-out set below is that test.

## Held-out set d (5 tasks, 120 sessions; written by an agent that had not read this code; its text was never read by the controller)

| Task | ours | base | dod | dod-inv | gwc | gwc-inv | iso | iso-inv | max |
|---|---|---|---|---|---|---|---|---|---|
| X1 | 0.67 | 1.00 | 1.00 | 1.00 | 1.33 | 1.00 | 1.67 | 1.00 | 4 |
| X2 | 2.67 | 2.00 | 3.00 | 2.33 | 1.67 | 1.67 | 1.33 | 2.67 | 4 |
| X3 | 3.00 | 4.00 | 4.00 | 4.00 | 4.00 | 4.00 | 4.00 | 4.00 | 4 |
| X4 | 1.00 | 1.00 | 1.00 | 2.33 | 1.00 | 1.00 | 1.00 | 1.00 | 4 |
| X5 | 4.00 | 4.00 | 4.00 | 4.00 | 4.00 | 4.00 | 4.00 | 4.00 | 4 |
| total | 11.33 | 12.00 | 13.00 | 13.67 | 12.00 | 11.67 | 12.00 | 12.67 | 20 |

Rule A: ours lost 8.67, best other lost 6.33: fail. Rule B: fail on X1 to X4. Rule B': fail. I1: mean difference -0.47 per cell, 95% interval [-0.93, 0.00] over 15 cells: does not hold; ours has the lowest total of the 8 arms.
Reading: on a set nobody tuned against, the product is not ahead; the differences between arms are small except X4 (dod-invoked) and the totals of all arms lie within 2.34 points of each other. Nothing was changed after seeing these numbers (owner rule: publish what the frozen measurement gives).
This set is now used up as a held-out set. Its tasks, fixtures and ground truth are copied to `heldout-d/` (task text not read by the controller).

## Verification parts (docs/FINAL-PROTOCOL-r9.md section 3)

- **F6-grader (gating):** a seeded 10 percent sample (29 public cells, 19 held-out cells; sample in `f6/sample.json`, chosen by SHA-256 of the cell id so it was fixed before any regrading) was re-graded by three fresh grader sessions each. Criterion agreement 100.0 percent (80 and 76 judged outcome criteria), largest cell difference 0 points: **pass** on both sets (`f6/f6grader-*.txt`).
- **F6-runs (descriptive):** the sampled (task, arm) cells re-run once on fresh fixtures: public 18 of 26 re-run scores inside the min-max of the three original runs, held-out 15 of 17 (`f6/f6runs-*.txt`). One run of an agent varies about as much as the original three runs do.
- **F9 (descriptive, not gating), 1 run per task for ours, base and the best other arm of the set, same grading method with three votes:**

| Model | public: ours / base / iso-invoked (max 63) | held-out d: ours / base / dod-invoked (max 20) |
|---|---|---|
| Sonnet (3 runs, main) | 62.33 / 47.33 / 48.33 | 11.33 / 12.00 / 13.67 |
| Haiku 5.5 | 59.00 / 49.00 / 48.00 | 13.00 / 12.00 / 15.00 |
| Opus 5 | 62.00 / 48.00 / 43.00 | 14.00 / 15.00 / 15.00 |

The pattern repeats on all three models: clearly ahead on the public tasks, not ahead on the held-out set.

## Grader reliability and errors
Five votes per task (seeds 1 to 5, reason first); close splits were re-asked with seeds 6 and 7 (public tasks H3, H6, T2, T6; held-out X1, X2, X4). Remaining close splits after re-ask: 6 public, 4 held-out criteria (`public/grades/AGREEMENT.json`). Criteria with fewer than three valid votes: 0 in both sets. One invalid vote (public H6, vote 5: a criterion without a boolean) was dropped by the valid-vote rule.

## Cost (CLI list price, not the subscription charge; paid by the owner's Claude Code subscription login)
Public sessions 20.17 USD (312), held-out sessions 8.85 USD (120), F9 sessions 21.7 USD (Haiku 0.29, Opus 21.44), F6 re-runs 3.02 USD; grading calls about 46 USD in total (including F6 and F9 grading); measurement total about 99.9 USD list price. Per-cell cost in `*/cost.csv`. Not counted: the development gate (about 16 USD list) and the controller, implementer and reviewer sessions.

## Departures and incidents
- Session limit hit during public task H3: 18 sessions (H3 for dod, dod-invoked, gwc, gwc-invoked, iso, iso-invoked) returned "session limit" and were set aside unscored in `failed-limit/` (not in the evidence runs), then re-run after the reset with the same command. A second limit hit stopped 8 Opus F9 sessions on held-out d, and the first Opus F9 grading attempt had ungraded tasks in all six vote runs; the stopped sessions were set aside and re-run, the Opus grading was deleted and redone from scratch, and no failed session or call was scored.
- Amendment A2 (see protocol): table-only Rule B fix after the public totals were seen; the pre-fix output (Rule B FAIL on H6, H7, T2, T3, all ties at the maximum) is superseded; totals, Rule A and the bootstrap are unchanged by it.
- Rule B' and the exception rules are reported next to Rule B; the pre-registered launch claim is I1.
- The F6 sample size for the held-out set is 19 of 120 cells (15.8 percent) because the hash rule gives about 10 percent on average.
- The first development-gate cells ran below the owner's home directory and loaded the owner's global instruction file; they were discarded and every measurement cell runs under `/private/tmp` (DEV-GATE-r9.md section 7). The same issue may affect other repositories' cells whose work directory is below the home directory.
- Not run: superpowers and compound-engineering arms (extra arms in the r6 held-out set).
