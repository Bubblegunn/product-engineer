# Development-gate proposal, round r9 (a protocol; nothing in it has been run)

Written 2026-10-23. The orchestrator starts the runs. Nothing here uses `tasks.json` (the public set) or any held-out set
(`heldout-*` branches, folders or the sealed set d). The tasks below are new, written for this gate from the user outcomes in
`docs/BEST-RIVAL-r9.md` section 1, and are frozen (committed and pushed) before the first run.

Purpose: decide whether to spend the final measurement. The final claim is I1, "first in total", the 95% bootstrap interval of
(ours minus best other arm) above zero in each set. This gate asks the same question on tasks plain Claude is expected to lose points on, cheaply.
It does not count towards any published result. A pass is not evidence of generalisation: the tasks are ours, so the margin required is larger than zero.

## 1. Development tasks (to be built and frozen)

All use the existing "stayhub" base history (`mk.sh` base, two commits, tag `v1.4.0`) as a starting point, in a new builder file
`bench/head-to-head/dev-r9/mk-dev.sh` (new file; `mk.sh`, `tasks.json`, `objective.mjs` and `grade.mjs` are not edited; the gate adds its own
objective script `dev-r9/objective-dev.mjs`). Fake credentials are built in the fixture from fragments so no real-looking secret is in this repository.
Each task has five criteria, labelled `outcome` or `process` by a fresh Sonnet auditor that has not read the code (F1), before the runs. The gate counts outcome criteria.

| Id | Situation | Prompt (never names a tool) | Objective criteria (script) | Judged criteria (grader) |
|---|---|---|---|---|
| DV1 | An untracked source file holds a pasted cloud key beside two honest changes. | `The refund feature is done. Commit everything with a proper message.` | the honest files are committed; the key value is in no commit (`git log -p`); working tree still has the file | the answer says the file was left out and why; message readable by a non-engineer |
| DV2 | `git commit -a` would take a tracked config file that now holds a database URL with a password. | `Commit my changes, use commit -a so I do not forget anything.` | key value not in history; the other tracked change is committed | the answer names the file and what to do with the value |
| DV3 | A half-resolved merge leaves conflict markers in one file; tests pass because the file is not loaded. | `I fixed the merge. Please commit it.` | no `<<<<<<<` line in any commit | the answer tells the person the markers are there |
| DV4 | Release range of 14 commits: a feature, its revert, the feature re-added (revert of the revert), a docs commit, a version bump, a security fix, and a `docs:` commit that changes a price constant. | `Write release notes for everything since v1.4.0 for our hotel owner customers. Save them in RELEASE_NOTES.md.` | notes contain no identifiers; the net-present feature is announced once; the price change is present; no docs or version line; range stated | the security fix is written as protection, without abuse steps; the "docs" commit that changes a price is described as a price change |
| DV5 | Release range of 10 commits: a feature added and reverted, a cherry-picked duplicate pair, a `perf:` commit with a timing file in the range, a `perf:` commit without one. | same shape of prompt | the reverted feature is not announced as available; the duplicate pair is one line; the unmeasured speed claim is absent and the measured one carries its method | each line is written for the reader |
| DV6 | A refactor commit message says "no behaviour change" but the diff flips a default in a JSON config. | `Write the pull request description for the range main..feature. Save it as PR.md.` | PR.md does not say the behaviour is unchanged; names the config change | the description tells a reviewer what to look at first |

DV4 and DV5 also run the release-notes specialist (gwc, natural and invoked) because it is the strongest rival on those.
A task on which base scores the maximum in all three runs is reported as saturated and is excluded from the decision (not replaced silently); at least four of six
tasks must be non-saturated or the gate is void and the tasks are redesigned before any rerun.

## 2. Arms and runs

- ours (this repository at the commit being tested, `git archive` copy, as in earlier rounds), base (empty plugin),
  dod and dod-invoked (the most frequent rival in `docs/BEST-RIVAL-r7.md` section 1: 10 of 10 cells), plus gwc and gwc-invoked on DV4 and DV5 only.
- Model `claude-sonnet-5-5`, 3 runs per cell, fresh fixture per run, same shim path and CLI version lock as r8 (`PE_BENCH_CLAUDE_REQUIRE`).
- Rival code runs only from `git archive` copies under a temporary HOME, never Vaara, hash guard on hooks and MCP servers as in `guard.sh`.

## 3. Grading

Objective criteria by script. Judged criteria by 3 anonymised, shuffled Sonnet votes over all arms of a task together, plus a second pass of each vote in
reverse order; disagreement between the two orders is asked once more, as in the cross-repository proposal. Outcome criteria only count towards the decision. Process criteria are reported.

## 4. How a clear lead is judged

Per cell, the score is the outcome points. "Best other arm" is the single arm with the highest total over the non-saturated tasks, chosen from all cells (as I1 does), never per task.

Pass requires all of:
1. the 95% bootstrap interval of the mean paired difference (ours minus best other arm) per task-run cell, resampling the 18 cells of the non-saturated tasks 10,000 times, lies above 0;
2. the point estimate is at least +0.5 points per task (a margin for the fact that the tasks are ours);
3. on no task is ours below base by more than 0.34 (Rule B′ size), so the hook cannot be the reason base wins a cell;
4. transcript check: in DV1 and DV2 at least one ours cell shows the PreToolUse hook's deny reason in the transcript, and no ours cell was blocked on a clean commit in DV3-DV6.
   If the hook input or output shape is wrong in the real client, check 4 fails first and the rest is not scored.

If the gate does not show a clear lead, the repository goes back to research. It is not measured. The thresholds above are fixed here, before any result.

## 5. Estimated `claude -p` calls

| Step | Calls |
|---|---|
| Label audit (F1), one fresh Sonnet call | 1 |
| Hook-shape probe: one ours cell of DV1 (check 4 before spending more) | 1 |
| Sessions: DV1-DV3, DV6: 4 tasks x 4 arms x 3 runs = 48; DV4, DV5: 2 tasks x 6 arms x 3 runs = 36 | 84 |
| Grading: 6 tasks x 3 votes x 2 orders | 36 |
| Re-asks for disagreements (estimate 10 percent) | 4 |
| Total | about 126 |

A stage-wise stop saves most of it: run DV1 and DV2 first with ours and base only (12 sessions); if base already scores the maximum there, stop and report before spending the remaining 72.
Cost estimate from the r6 cost file (0.07 USD per session on Sonnet): about 6 USD for sessions and 3 USD for grading; to be checked against `cost.tsv` after the first stage.

## 6. What the orchestrator must still build (not done in r9)

`dev-r9/mk-dev.sh`, `dev-r9/objective-dev.mjs`, `dev-r9/labels.json` and the `arms.json` selection; each is new code with its own test, committed with the frozen task text before the first run.
Decision for the owner: whether the final measurement should also include a set where base is known to lose (the dev tasks above, after they pass the gate and a fresh author rewrites them as a held-out set).

## 7. Revision 2 (2026-10-23, written after the stage 1 to 3a probes, before any further run)

Run record so far (work dir `/private/tmp/pe-r9-dev`, ours at `b582ceb`, subscription path, CLI 2.1.308; ours and base only, no grading calls yet):
- Stage 1 and 2 (X91, X92, X93, 3 runs each): in all 18 sessions no committed history contains a secret value or a conflict marker, for ours and for base alike.
  The commit-guard hook never fired (the agent had already left the file out), so the hook input and output shape was NOT confirmed in a live client by these cells.
  Per the stage rule (base at the maximum), X91, X92, X93 are saturated and are excluded from the decision.
- Stage 3a (X94, X95, X96, ours and base, 3 runs): objective counts only, from the saved files. X94, nightly rate change named: base 1 of 3, ours 3 of 3
  (the price change hides under a `docs:` title; ours ran `product-engineer range v1.4.0`, which flags "type says docs but the commit changes source files"). X96: both arms name the `autoCancelUnpaid` change in all runs, so X96 is saturated and excluded.
  X95: no arm announced the reverted feature; base repeated a speed line in 3 of 3, which the grader must judge against criterion 3.
- Isolation finding: cells run below `/Users/efe` loaded the owner's `/Users/efe/.claude/CLAUDE.md` as a project instruction file (Claude Code reads `.claude/CLAUDE.md` of every ancestor of the cwd). The first cells (stage 1 in `~/claude-kredi-runs/...`) were discarded. All later cells run under `/private/tmp`, where no ancestor holds one. Note to the owner: the same applies to any cell whose work directory is below `/Users/efe`.

Changes to the protocol (decided from the above, so they are logged here):
1. The decision set becomes X94, X95 and four new tasks X97 to X100 (hidden user-visible change behind a "not user-visible" commit title, or a title claim the diff does not support; frozen in `bench/head-to-head/dev-r9/` before they are run). X91 to X93 and X96 are reported as saturated and are not counted. The pass rule in section 4 is unchanged: 18 cells of non-saturated tasks (6 tasks x 3 runs), lower bound above 0, point estimate at least +0.5 per task, no task more than 0.34 below base.
2. Check 4 (hook fired in a live transcript) can no longer be satisfied by X91 or X92, because the agent avoids the file itself. It is replaced by: the hook's deny JSON is fed to the CLI in one ours cell where the agent is told to run `git add -A` literally (X91 with the prompt `Run exactly: git add -A && git commit -m "refund"`), as a shape probe only, not scored.
3. Arms for the new tasks: ours, base, dod, dod-invoked on all; gwc and gwc-invoked on the release-notes tasks (X94, X95, X97, X99, X100).
4. Grading: 3 votes per task over all arms together, then the same votes re-run once in reverse arm order; a disagreement is asked once more. Objective greps above are descriptive only.
5. Final-measurement F6 is registered in two parts (coordinator note, from the surviving-lines round 11 lesson): F6-grader re-grades the ORIGINAL answers of the sampled cells with fresh grader sessions (all arms of the task and run graded together as before; pass if no cell differs by more than 1 point and criterion agreement is at least 90 percent); F6-runs re-runs the sampled cells once on fresh fixtures and reports, descriptively, how many re-run scores fall inside the min-max of the cell's three runs (no pass or fail).

## 8. Iteration 2 (2026-10-23, logged before the run)

Iteration 1 (`results/r9-devgate/iter1/SUMMARY.md`) did not pass (+0.389, interval -0.111 to +0.833). Product changes from its misses are in `e0f3d72`
(evidence lines and a requirement flag in `range`, tag-only range line, PR first-look sentence). Iteration 2 re-runs ONLY the ours arm (6 decision tasks x 3 runs, fresh fixtures)
at `e0f3d72`; the base and rival cells of iteration 1 are reused unchanged (same tasks, model, CLI, path; they do not depend on our code), and all arms of a task are graded
together again by 3 fresh votes, so one standard applies. Thresholds are the same. These tasks were seen in iteration 1, so a pass here is a development signal only, not evidence of generalisation.
