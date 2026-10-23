# Development gate, round r10 (protocol frozen 2026-10-23 evening, before any ours session of this gate)

Why: in r9 ours led on the tasks it was developed against and was last on the held-out set d (`results/r9-final/SUMMARY.md`). This gate uses tasks we did not write.

## Tasks
- **Decision set:** 12 tasks written by three fresh Sonnet agents (W1 commits and pull requests: X11 to X14; W2 history written for other readers: X21 to X24; W3 doing and reporting work honestly: X31 to X34). Each writer got only a plain description of the user's job (no code, docs or earlier tasks of this project) and worked in an empty directory. Their task text is not read by the controller before the results are in. 48 outcome criteria.
- **Descriptive only (not in the decision):** the five tasks of set d (read since r9, used as development material), ours re-run at the gate commit, the other arms' cells reused from `results/r9-final/heldout-d/` (same model, CLI, path, arms), regraded together with the new ours cells.

## Arms and runs
ours (the gate commit), base, dod, dod-invoked, iso, iso-invoked, gwc, gwc-invoked. 3 runs per cell, fresh fixtures, Sonnet `claude-sonnet-5-5`, Claude Code 2.1.308, subscription path, work directories under `/private/tmp`. Rival arms run only from `git archive` copies. A session that shows a limit or auth error is set aside and re-run, never graded.

## Grading
Five joint votes per task (seeds 1 to 5, reason first), majority of valid votes, fewer than three valid = err; close splits re-asked once with seeds 6 and 7. Outcome criteria only; `final-score.mjs` computes the numbers.

## Clear lead (all four must hold on the decision set; fixed here, before the run)
1. The lower bound of the 95% bootstrap interval of (ours minus the best other arm) per paired (task, run) cell is above 0 (best other arm = the single other arm with the highest total on the decision set; 36 cells).
2. The point estimate is at least +0.5 outcome points per cell.
3. In each writer's own set (W1, W2, W3), ours' total is at least the best other arm's total in that set (point estimates).
4. On no task is ours more than 0.67 points below base.
If any fails, the answer is "no clear lead": back to diagnosis (the read sets now include these twelve tasks), then a new gate with fresh writers. Thresholds are not changed after the results.

## Estimate
Rivals and base: 7 arms x 12 tasks x 3 runs = 252 sessions; ours: 36 plus 15 on set d; grading about 12 + 5 tasks x 5 to 7 votes, about 110 calls. About 40 USD at list price on the subscription.
