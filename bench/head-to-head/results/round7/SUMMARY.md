# Round 7 summary (2026-10-23): development gate only, gate FAILED, no new held-out set measured

**Scoped result.** Ours was run 3 times per task on two already-seen held-out sets (set c, 5 tasks, round 6; set b, 4 tasks, deep round), twice
(iteration 1 at commit `86c90cc`, iteration 2 at `c8541b3`), model claude-sonnet-5-5, Claude Code 2.1.308 through the Agent SDK shim, macOS,
parallelism 3, graded alone with 3 Sonnet votes. These runs are development data. They are not scored, they do not support a "first" claim, and
the development gate did not pass, so held-out set d (written, never run, local branch `heldout-2026-10-d`), the public 13 tasks, F9 and F6 were
not run. Rival columns are published values from earlier rounds (see `score.py` header), not new runs.

<!-- score.py -->
```
iteration 1, set c (ours x3, outcome mean of 4; best published rival; result)
  X1: 3.00 [3, 3, 3]  rival 4.0  fails
  X2: 4.00 [4, 4, 4]  rival 4.0  ok
  X3: 4.00 [4, 4, 4]  rival 4.0  ok
  X4: 3.33 [3, 3, 4]  rival 4.0  fails
  X5: 4.00 [4, 4, 4]  rival 4.0  ok
iteration 1, set b (ours x3, outcome mean of 4; best published rival; result)
  X1: 4.00 [4, 4, 4]  rival 4.0  ok
  X2: 2.00 [2, 2, 2]  rival 1.33  ok
  X3: 2.67 [2, 2, 4]  rival 2.0  ok
  X4: 3.00 [3, 3, 3]  rival None  no rival data
iteration 2, set c (ours x3, outcome mean of 4; best published rival; result)
  X1: 3.00 [3, 3, 3]  rival 4.0  fails
  X2: 4.00 [4, 4, 4]  rival 4.0  ok
  X3: 4.00 [4, 4, 4]  rival 4.0  ok
  X4: 4.00 [4, 4, 4]  rival 4.0  ok
  X5: 3.67 [4, 4, 3]  rival 4.0  fails
iteration 2, set b (ours x3, outcome mean of 4; best published rival; result)
  X1: 4.00 [4, 4, 4]  rival 4.0  ok
  X2: 1.33 [2, 2, 0]  rival 1.33  fails
  X3: 2.67 [3, 1, 4]  rival 2.0  ok
  X4: 3.00 [3, 3, 3]  rival None  no rival data
iteration 3, set c (ours x3, outcome mean of 4; best published rival; result)
  X1: 3.00 [3, 3, 3]  rival 4.0  fails
  X2: 4.00 [4, 4, 4]  rival 4.0  ok
  X3: 4.00 [4, 4, 4]  rival 4.0  ok
  X4: 4.00 [4, 4, 4]  rival 4.0  ok
  X5: 4.00 [4, 4, 4]  rival 4.0  ok
iteration 3, set b (ours x3, outcome mean of 4; best published rival; result)
  X1: 4.00 [4, 4, 4]  rival 4.0  ok
  X2: 2.00 [2, 2, 2]  rival 1.33  ok
  X3: 1.00 [0, 0, 3]  rival 2.0  fails
  X4: 3.00 [3, 3, 3]  rival None  no rival data
```
<!-- /score.py -->

**Gate rule (BEST-RIVAL-SPEC step 6).** Ours must be strictly above the best published rival on every task, or at the ceiling together with it.
Iteration 1: set c X1, X4 fail; set b passes where a rival exists; X4 of set b has no rival data. Iteration 2: set c X1 (3.00 against 4.00) and X5
(3.67) fail; set b X2 ties the best rival (1.33 = 4/3) and a tie fails. Not passed after the 3 allowed iterations (see below).

## What changed between iterations
- Iteration 1 (`86c90cc`): `notes` accepts option names and typed commands; skill keeps the request language. Set c X3 went from a 3.67 mean
  (round 6) to 4.00 in 3 of 3.
- Iteration 2 (`c8541b3`): skill rule: read the repository docs before advising on a failure outside the change. Set c X4 went from 3.33 to 4.00.
  Cause of the remaining losses, from the grader reasons stored in `grades/`: set c X1 criterion 1 fails in 6 of 6 runs because the grader material reads
  "NEW COMMITS (none)" (held-out run folders have no `.git/fixture-state`, `bench/head-to-head/objective.mjs:41`); that is a harness limit, not
  evidence about the product, and neither the grader nor the criterion was changed. Set c X5 and set b X2 and X3 vary between runs (for example set b X2
  run 3 scored 0 in iteration 2 and 2 in iteration 1); with 3 runs they cannot be separated from noise, and their criteria were not diagnosed in this round.

## Departures from the plan
1. Ours alone was graded (not jointly with the rival arms), so the grader saw no comparison answers; scores are not byte-comparable to the joint-graded rival values.
2. Iteration 3 was first blocked by an environment fault (see Departure 6) and then run.
3. Two drivers were started at once for about a minute (parallelism 6 instead of 3) before the second was killed; both work folders were deleted and the sessions rerun at parallelism 3.
   The first grading attempt failed with exit 1 on all calls (a placeholder path in the wrapper), cost 0 USD, and was rerun.
4. No raw tool traces are in `runs/`: only the redacted final answer and the cost of each cell (the trace files are large). Redaction replaced the home path and e-mail addresses.
5. The best-rival document (`docs/BEST-RIVAL-r7.md`) was written by a Sonnet subagent; its file:line claims about rivals were not independently re-checked by the controller.

## Cost (sum of the cost files in this folder)
54 sessions 4.1520 USD; 54 grader calls 1.9069 USD; held-out set d author 0.2610 USD; billing check 0.0026 USD; total 6.3225 USD (cost cap 30 USD). The subagents' own cost
(best-rival document, review) is not recorded in these files.

## Iteration 3 (commit `00109d7`), third and last allowed iteration: gate still NOT passed
Design: `docs/HEAD-TO-HEAD.md` "Round 7 development gate, iteration 3 design" (committed before the code). Rules added to the skill: reader-first commit subject for a non-technical
reader, old and new value of a changed limit, code check before a rewrite is saved (Sonnet review: 3 findings applied). `npm test`: 730 passed, 0 failed.
Result (table above): set c 4.00 on X2, X3, X4, X5 and 3.00 on X1; set b X1 4.00, X2 2.00 (above 1.33), X3 1.00 (below the rival 2.00), X4 3.00 (no rival data). Fails on set c X1 and set b X3.
- Set c X1 criterion 1: same grader-material limit as before (no `.git/fixture-state`), 3 of 3 runs. Not a product behaviour.
- Set b X3: runs 1 and 2 scored 0 of 4 because the grader material did not show the rewritten file (the agent committed it and the material lists only the commit's stat);
  run 3 scored 3. The criteria were not changed. This cell moved from 2.67 (iteration 2) to 1.00; with 3 runs it is a large swing, and it counts against the gate.

**Departure 6 (environment of the first two attempts at iteration 3, now resolved).** The first two attempts produced 400 errors (`thinking.type.enabled is not supported`, then
`tool_use ids must be unique`; 1.1023 USD, no score). Cause found from `meta.json`: those cells recorded `claude_version` "2.1.2 (Claude Code)", while iterations 1 and 2 recorded
"2.1.308". The runner resolves `claude` through the PATH it is given; when the shim directory was not first on PATH, `/usr/local/bin/claude` (2.1.2, old) ran. Fix: start the driver
with the shim directory first on PATH, with the default settings file (`{"hooks":{}}`), and with no settings override; a probe of 3 cells (X1) then recorded 2.1.308, no error. All 27
iteration 3 cells below recorded `claude_version` 2.1.308 (`runs/iter3/*/*/*/*/cost.json`), the same as iterations 1 and 2. The earlier settings-override attempt is therefore not used anywhere in the scores.
Not verified: whether the owner's `MAX_THINKING_TOKENS`/`CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING` were present in the first two iterations' process environment (they are inherited the same way now).

## Why the gate stops here
Three iterations are allowed per round (BEST-RIVAL-SPEC step 6) and all three are used; the gate did not pass. Held-out set d (written, never run, local branch `heldout-2026-10-d`), the
public 13 tasks, Rule A/B/B' on a new set, F9 and F6 were not run. Nothing here supports a "first" claim.

## Statistics and cost accounting
Spend in the cost files (`cost.tsv`): 81 sessions in three iterations (27 valid in each) 4.1520 + 2.0258 USD = 6.1778 USD plus 1.1023 USD for 15 failed cells of attempt 2 of iteration 3 (counted, not scored);
81 grader calls 2.8282 USD; held-out set d author 0.2610 USD; billing check 0.0026 USD; total 10.3719 USD (round cap 30 USD). Subagent cost (best-rival document, two reviews) is not in these files.
Variance observed (same product, same task, 3 runs, outcome points of 4): set b X2 runs scored 2,2,2 / 2,2,0 / 2,2,2; set b X3 2,2,4 / 3,1,4 / 0,0,3; set c X5 4,4,4 / 4,4,3 / 4,4,4. No confidence interval is
computed: with 3 runs per cell it would not be meaningful, and the grader saw ours alone, not the rival answers. No rival arm was re-run, so no rival-versus-ours statistic exists.
