# Development gate 3, round r10 (protocol frozen 2026-10-24, before any session of this gate)

Why: gate 2 (`results/r10-gate2`) put ours first (41.00 vs 38.67 of 48, interval +0.03 to +0.36) but the frozen clear-lead rule failed (point +0.19 below +0.5; writer W5 lost by 0.33). The owner ruled option 2: diagnose, build the unbuilt rows, cut false blocks and cost, then a new gate with new writers under the same five-part rule. The 12 tasks of gate 2 are read material. This gate tests the improved product on tasks nobody on this project wrote or read.

## Tasks
12 tasks from three NEW fresh Sonnet writers (W7 multi-file changes and maintenance, X71 to X74; W8 committing from a messy working tree, X81 to X84; W9 explaining changes to non-coders and integrators incl. one Turkish prompt, X101 to X104). Each writer got only a plain description of the job in an empty directory; repositories are realistically sized (15 to 40 files, up to 70 commits). The controller has not read the task text. 48 outcome criteria.

## Arms and runs
ours at the gate commit (set before the first ours session and written in the run log), base, dod, dod-invoked, iso, iso-invoked, gwc, gwc-invoked. 3 runs, fresh fixtures, Sonnet `claude-sonnet-5-5`, Claude Code 2.1.308, subscription path with the per-call HOME wrapper, work directories under `/private/tmp`. Rival code only from `git archive` copies. Limit or auth errors: set aside and re-run, never graded. The second eye is OFF by default (opt-in) in ours (decision from the read material: no measured benefit, extra cost).

## Grading
Five joint reason-first votes per task, majority of valid votes, fewer than three valid = err, close splits re-asked once with seeds 6 and 7 (the method of the final protocol of r9, unchanged).

## Clear lead (all must hold; same as DEV-GATE-r10 plus a cost clause)
1. Lower bound of the 95% bootstrap interval of (ours minus the best other arm) per paired (task, run) cell is above 0 (36 cells).
2. Point estimate at least +0.5 per cell.
3. In each writer's own set (W7, W8, W9), ours' total is at least the best other arm's total.
4. On no task is ours more than 0.67 below base.
5. Cost: mean session cost per cell of ours at most 1.5 times base's.
If any fails: no clear lead; diagnose (the 12 tasks become read material), do not re-run this gate on the same tasks; the owner decides whether to measure anyway. Thresholds are not changed after the results.

## Next step on a clear lead
A final measurement per `docs/FINAL-PROTOCOL-r9.md` rules with a sealed fresh set from a further writer, frozen before its first run.
