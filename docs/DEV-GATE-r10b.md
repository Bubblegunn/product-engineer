# Development gate 2, round r10 (protocol frozen 2026-10-24, before any session of this gate)

Why: gate 1 and check 1 (`results/r10-gate1`, `results/r10-check1`) showed no clear lead on the 12 tasks then written, and the 12 tasks are now read material. The mechanisms of `docs/R10-MECHANISMS.md` and the Phase A rows of `docs/BEST-RIVAL-r10-deep.md` were built afterwards. This gate tests them on tasks nobody on this project wrote or read.

## Tasks
12 tasks from three NEW fresh Sonnet writers (W4 pull requests and review hand-off, X41 to X44; W5 doing work and reporting it, X51 to X54; W6 writing about longer histories for other readers, X61 to X64). Each writer got only a plain description of the job in an empty directory; repositories are realistically sized (15 to 40 files, up to 70 commits). The controller has not read the task text. 48 outcome criteria.

## Arms and runs
ours at the gate commit (set before the first ours session and written in the run log), base, dod, dod-invoked, iso, iso-invoked, gwc, gwc-invoked. 3 runs, fresh fixtures, Sonnet `claude-sonnet-5-5`, Claude Code 2.1.308, subscription path with the per-call HOME wrapper, work directories under `/private/tmp`. Rival code only from `git archive` copies. Limit or auth errors: set aside and re-run, never graded. The second eye is OFF by default (opt-in) in ours.

## Grading
Five joint reason-first votes per task, majority of valid votes, fewer than three valid = err, close splits re-asked once with seeds 6 and 7 (the method of the final protocol of r9, unchanged).

## Clear lead (all must hold; same as DEV-GATE-r10 plus a cost clause)
1. Lower bound of the 95% bootstrap interval of (ours minus the best other arm) per paired (task, run) cell is above 0 (36 cells).
2. Point estimate at least +0.5 per cell.
3. In each writer's own set, ours' total is at least the best other arm's total.
4. On no task is ours more than 0.67 below base.
5. Cost: mean session cost per cell of ours at most 1.5 times base's.
If any fails: no clear lead; diagnose (the 12 tasks become read material), do not re-run this gate on the same tasks. Thresholds are not changed after the results.

## Next step on a clear lead
A final measurement per `docs/FINAL-PROTOCOL-r9.md` rules with a sealed fresh set from a further writer, frozen before its first run.
