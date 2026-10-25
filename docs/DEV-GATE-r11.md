# Development gate 4, round r11 (protocol frozen 2026-10-25, before any session of this gate)

Why: gates 1 to 3 pooled (36 tasks, 9 writers) put ours level with the bare model (117.33 against 117.67 of 144). The rival analysis
(`docs/RIVAL-ANALYSIS-2026-10-25.md`) named seven general causes; the redesign (commits `3f6e4ad6`, `7c17fe31`, `bbe8673c` and
later) addresses them, and the offline replay (`docs/REPLAY-2026-10-25.md`) found no new block, finding or error on the 108 stored
sessions. This gate tests the redesigned product on tasks written by writers who never saw the tool, its documents or any earlier task.

## Tasks
12 tasks from three NEW fresh Sonnet writers, each given only a plain description of a user's job and an empty directory:
W10 maintenance work handed to an assistant (X111 to X114), W11 telling other people about the work (X121 to X124, one prompt in
a language other than English), W12 version-control housekeeping in a messy working tree (X131 to X133, and X134 by W12b). The controller has not read
the task text (it only checks the counts and that every fixture builds: 12 tasks, 60 criteria, 48 outcome, every fixture exits 0 with 20 to
30 commits and 21 to 25 tracked files, no secret-shaped string found by a scan). The controller did read each writer's closing paragraph (a
list of titles and the loose ends it built), which W10, W11 and W12b returned; nothing was changed because of it. Writer W12 stopped after
X131 to X133 and a half-written X134 (moved to `/private/tmp/pe-r11/writers/aborted`, unread); X134 was written by a second writer, W12b,
with the same brief for one task. Tasks are prepared with
`heldout-prep.mjs` (counts only).

## Arms and runs
ours at the gate commit `bbe8673c8afe545ede19a77d0e77b762b4e5c65e` (the product code of the redesign; later commits change documents only; recorded again in `results/r11-gate4/RUNLOG.md`), base, dod, dod-invoked, iso,
iso-invoked, gwc, gwc-invoked: the arms of gate 3, rival code from the pinned `git archive` copies in `arms.json`. 3 runs, fresh
fixtures, Sonnet `claude-sonnet-5-5`, Claude Code 2.1.308, three sessions at a time, subscription path with the per-call HOME wrapper, every work directory under
`/private/tmp`, ours from an immutable `git archive` of the committed sha. A session that shows a limit or auth error is set aside
and re-run, never graded.

## Grading
Five joint reason-first votes per task (seeds 1 to 5), majority of valid votes, fewer than three valid = err, close splits re-asked
once with seeds 6 and 7: the method of gate 3 and of the final protocol of r9, unchanged. Grader cwd under `/private/tmp`. Outcome
criteria only; `final-score.mjs` computes the numbers.

## Pass rule (the only gating rule)
**I1:** the lower bound of the 95% bootstrap interval (10000 resamples, seed 12345) of (ours minus the best other arm), per paired
(task, run) cell (36 cells), is above 0. The best other arm is the single other arm with the highest total on the 12 tasks.

Reported, not gating: the point estimate, each writer's totals, tasks on which ours is more than 0.67 below base, the cost ratio of
ours to base, and the totals pooled with gates 1 to 3. Thresholds are not changed after the results.

## After the result
Pass: the final measurement on a sealed set from a further new writer, with its own protocol frozen before its first run.
Fail: the 12 tasks become read material; diagnose, at most one more redesign iteration and one more gate with new writers, then stop
and write a Resume. This gate is not re-run on the same tasks, and no cell is shaped, dropped or re-graded to move a number.
