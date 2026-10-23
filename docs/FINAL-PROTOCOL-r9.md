# Final measurement protocol, round r9 (frozen 2026-10-23, before the first scored session)

Frozen by the committing of this file, before any session of this measurement runs. The scoring tools (reason-first grader switch, vote merge, final scorer) are still being finished when sessions start; they are committed and pushed before the first grading call, and sessions do not depend on them.
 any later change is logged under "Changes after the freeze" at the end, never made silently.
Authority: spec section 2b (owner decisions of 2026-10-23) and the coordinator notes of the same day (summarised in section 7).
Claim being tested, claim I1: **first in total**. In each set, the 95% bootstrap interval of (ours minus the best other arm's total) lies entirely above zero.
Scoped as: these tasks, model `claude-sonnet-5-5`, Claude Code 2.1.308, 2026-10-23, the subscription path. The per-task table (Rules A, B, B') is published in full, losses included, and does not decide the claim.

## 1. What is measured

- **Product under test:** commit `e0f3d720b0e38d23b21541cedc965e373a5f7f49` (git archive copy, immutable). Tooling commits after it (under `bench/` and `docs/`) do not change the product.
  The development gate that justified this measurement is `docs/DEV-GATE-r9.md` and `results/r9-devgate/` (iteration 2 passed on seen tasks; a development signal only).
- **Set 1, public:** the 13 tasks in `bench/head-to-head/tasks.json` (T1 to T6, H1 to H7), unchanged since the freeze of 2026-10-21 (with the logged changes in HEAD-TO-HEAD.md). Their criteria, `obj`, `llm` and `both` kinds, are unchanged.
- **Set 2, held-out d:** the sealed set on local branch `heldout-2026-10-d`, written by an agent that had not read this code. It is extracted and prepared by `bench/head-to-head/final-r9/extract-d.sh`, which prints counts only.
  Nobody reads its task text before the sessions are done; the controller never reads it at all. Its criteria are all judged (`llm`), with `outcome` and `process` labels given by its author.
- **Arms (identical in both sets, 8):** ours, base (empty plugin), dod and dod-invoked (dod-guard `be038f7`), iso and iso-invoked (ISO 24495 `5951eb7`), gwc and gwc-invoked (git-weekly-changelog `f0164c0`),
  as pinned in `arms.json`. superpowers and compound-engineering (extra arms in the r6 held-out set) are not run; their absence is stated with the result.
- **Runs:** 3 per cell, each on a fresh fixture. No cell from any earlier round is reused. Parallelism 3.
- **Run path:** `sub-shim/claude` first on PATH (the owner's subscription login, `sdk-shim` removed), CLI version locked with `PE_BENCH_CLAUDE_REQUIRE="2.1.308 (Claude Code)"`.
  Work directories are under `/private/tmp` (`/private/tmp/pe-r9-final-public`, `/private/tmp/pe-r9-final-d`): cells run below `/Users/efe` load the owner's `/Users/efe/.claude/CLAUDE.md` (finding in DEV-GATE-r9.md section 7).
  `guard.sh` wraps every run as in earlier rounds. Rival code runs only from `git archive` copies (`arms/`), never Vaara.
- **Stop rule:** a session that shows a usage or session limit, HTTP 429, an authentication error or a credit-guard exit stops the whole driver at once; the failed cell is never graded and is reported as failed.

## 2. Scoring

- Outcome criteria only count towards totals (labels committed before the runs: `labels.json` for set 1, the author's labels for set 2). Process criteria are reported separately.
- `obj` criteria are decided by `objective.mjs` and stay the judge. `llm` criteria: **five grader calls per task** (joint grading, all arms of a task together, anonymous shuffled labels, seeds 1 to 5, `PE_BENCH_REASON_FIRST=1` so each criterion's reason is written before its verdict). `both` = objective AND judged.
  Per criterion the **majority of valid votes** decides; a vote is valid for a criterion if the grade file exists and holds a boolean for it; fewer than three valid votes = `err` (the run is listed and its criterion counts as failed, reported).
  A criterion with a 3-2 split is re-asked once with two more shuffled votes (seeds 6 and 7) for that task; the majority of seven then decides. `mergevotes.mjs` does the merge; `final-score.mjs` computes everything below from the merged grades.
- Statistics, per set: per-cell outcome scores; per-task means; per-arm totals; **best other arm** = the arm other than ours with the highest total in that set (a competitor counts with the better of its two forms only if that form is the best arm; the table shows both);
  paired bootstrap, 10,000 resamples with a fixed seed, over (task, run-index) cells of ours minus best other; claim I1 holds for the set if the lower bound of the 95% interval is above 0.
  Also reported: Rule A (our lost points at most 80 percent of the best other arm's lost points), Rule B (strictly higher on every task, or both at the task maximum), Rule B' (as B, one task up to 0.34 below the best allowed), all per task, losses included.
- A set where the best other arm is at the maximum on every task cannot give I1; that is reported as such and is not replaced after the fact.

## 3. Verification parts

- **F6-grader (pass or fail):** a seeded random 10 percent of cells; their ORIGINAL answers are re-graded by three fresh grader sessions per task (all arms of the task graded together as originally, seeds 11 to 13, reason first).
  Pass if no sampled cell differs from its consensus by more than 1 outcome point and criterion agreement over the sampled cells is at least 90 percent. A fail is reported and sends the grading back for repair; it does not delete the result.
- **F6-runs (descriptive):** the same sampled cells are re-run once on fresh fixtures; report how many re-run scores fall inside the min-max of the cell's three original runs. No pass or fail.
- **F9 (descriptive, not gating):** Haiku (`claude-haiku-5-5`) and Opus (`claude-opus-5`), 1 run per task, for ours, the best other arm of the set, and base; totals reported next to the Sonnet totals. The launch claim is Sonnet I1 only.
- Order of work, so that a limit hit loses the least: set 1 sessions, set 2 sessions (extracted only now), grading both, scoring, F6-grader, F9, F6-runs. Whatever has not run when the limit hits is reported as not run.

## 4. Evidence folder

`bench/head-to-head/results/r9-final/` with the eleven items of `EVIDENCE-SPEC.md` (prompts, fixtures, criteria with the freezing commit, every run's written files and traces with owner details redacted, grader prompts, vote files, label maps, scripts, a one-command re-run,
cost per cell and the total with who paid, deviations), `SUMMARY.md` generated by `final-score.mjs`, and a check that regenerates the summary byte for byte. Raw model transcripts that contain nothing the summary needs may stay out of the repository (as in earlier rounds), with their hashes listed.

## 5. What would void the measurement

A change to the product, the tasks, the criteria, a session script or the default grader prompt after the first session, or to any scoring tool after the first grading call; a session run below `/Users/efe`; a reused cell; a CLI version other than 2.1.308; reading the held-out text before its sessions finish. Any of these is reported and the affected set is not scored.

## 6. Cost estimate

About 430 sessions per Sonnet pass (312 for set 1, about 120 for set 2) at about 0.07 USD list price each (about 30 USD list; the subscription is what is charged), about 100 grader calls for scoring, F6 and F9 about 90 sessions more. Wall time at parallelism 3 is a few hours.

## 7. Owner and coordinator decisions applied (2026-10-23)

Launch claim is Sonnet I1 only; Haiku and Opus are descriptive. Five grader calls per cell with the reason written before the verdict and the majority of valid votes (fewer than three valid = err).
F6 in two parts (F6-grader gates, F6-runs is descriptive). Scripts stay the judge where a criterion is script-checked.

## Changes after the freeze

(none yet)
