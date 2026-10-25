# Final measurement protocol, round r11 (frozen 2026-10-25, before the first session)

Frozen by the committing of this file, before any session of this measurement runs. Authority: spec section 2b and the owner's order of 2026-10-25 (redesign, gate on new writers, then a final on a fresh sealed set). The method is the one of `docs/FINAL-PROTOCOL-r9.md` (sections 2 and 3), applied to a new set; where this file is silent, that file decides.

Claim tested, I1: **first in total**. In the set, the 95% bootstrap interval of (ours minus the best other arm's total) lies entirely above zero. Scoped as: these tasks, `claude-sonnet-5-5`, Claude Code 2.1.308, 2026-10-25, the subscription path. The per-task table (Rules A, B, B') is published in full, losses included, and does not decide the claim.

## 1. What is measured
- **Product under test:** commit `bbe8673c8afe545ede19a77d0e77b762b4e5c65e`, the product that passed gate 4 (`docs/DEV-GATE-r11.md`, `results/r11-gate4/`). No product change between the gate and this final. Commits under `bench/` and `docs/` do not change the product.
- **Set:** the sealed set of a new writer, W13, who had no access to this code, its documents or any earlier task: 6 tasks X141 to X146 (two each of maintenance work, telling other people, version-control housekeeping; one prompt in a language other than English), 30 criteria of which 24 are `outcome`. The controller has not read the task text, nor the writer's closing message (the writer was told to answer "done"). The controller saw only counts: every fixture builds (exit 0; 21 to 23 commits; 17 to 25 tracked files), no secret-shaped string in the set. Content hash of the set (sha256 of the sha256 of every file, `sha256sum tasks/*/* | sha256sum`, first 16 hex): `2e0c240230093be0`. A read-only copy is kept in `~/claude-kredi-runs/sealed/product-engineer-final-W13`.
- **Arms (8, as gate 4):** ours, base, dod, dod-invoked (dod-guard `be038f7`), iso, iso-invoked (ISO 24495 `5951eb7`), gwc, gwc-invoked (git-weekly-changelog `f0164c0`), as pinned in `arms.json`, from `git archive` copies.
- **Runs:** 3 per cell, each on a fresh fixture, three sessions at a time, no cell from any earlier round reused. `sub-shim/claude` (subscription, per-call HOME), CLI locked with `PE_BENCH_CLAUDE_REQUIRE="2.1.308 (Claude Code)"`, every work directory under `/private/tmp` (`/private/tmp/pe-r11-final-work`), ours from an immutable `git archive`.
- **Stop rule:** a session that shows a usage or session limit, HTTP 429/401/403 or an authentication error stops the driver at once; that cell is never graded; the measurement resumes with a fresh cell for it only if the stop was a limit, and every such event is reported.

## 2. Scoring
Outcome criteria only count. Five joint reason-first votes per task (seeds 1 to 5, `PE_BENCH_REASON_FIRST=1`), majority of valid votes, fewer than three valid = err, a 3-2 split re-asked for that task with seeds 6 and 7 (majority of seven), merged by `mergevotes.mjs`, computed by `final-score.mjs` (best other arm = the other arm with the highest total; paired bootstrap, 10,000 resamples, seed 12345, over (task, run) cells; Rules A, B, B' reported). Grader cwd under `/private/tmp`. If the best other arm is at the maximum on every task, I1 cannot hold and that is reported, not replaced.

## 3. Verification parts
- **F6-grader (pass or fail):** a seeded random 10 percent of cells (rounded up), their original answers re-graded by three fresh grader sessions per task (seeds 11 to 13, reason first). Pass if no sampled cell differs from its consensus by more than 1 outcome point and criterion agreement is at least 90 percent. A fail is reported and sends the grading back for repair; it does not delete the result.
- **F6-runs (descriptive):** the same sampled cells re-run once on fresh fixtures; report how many fall inside the min-max of the three original runs.
- **F9 (descriptive):** Haiku (`claude-haiku-5-5`) and Opus (`claude-opus-5`), 1 run per task, for ours, the best other arm of this set and base.
- The public 13-task set is not re-run in this round (the r9 public result, 62.33 against 48.33, belongs to the earlier product `e0f3d72`); this is stated with the result. Order: sessions, grading, scoring, F6-grader, F9, F6-runs.

## 4. What would void it
A change to the product, the tasks, criteria, a session script or the grader prompt after the first session, or to a scoring tool after the first grading call; a session run below `/Users/efe`; a reused cell; another CLI version; reading the set's text before its sessions finish. Any of these is reported and the set is not scored.

## 5. Cost
144 Sonnet sessions (about 0.08 USD list price each), about 60 grader calls, F9 and F6 about 60 sessions more.
