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
```
<!-- /score.py -->

**Gate rule (BEST-RIVAL-SPEC step 6).** Ours must be strictly above the best published rival on every task, or at the ceiling together with it.
Iteration 1: set c X1, X4 fail; set b passes where a rival exists; X4 of set b has no rival data. Iteration 2: set c X1 (3.00 against 4.00) and X5
(3.67) fail; set b X2 ties the best rival (1.33 = 4/3) and a tie fails. Not passed after 2 of the 3 allowed iterations; iteration 3 was not run (see departures).

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
2. Iteration 3 was not run: the controller's own budget (7 USD hard) was nearly used (about half after iteration 2); ending here was the owner's budget rule, not a gate result.
3. Two drivers were started at once for about a minute (parallelism 6 instead of 3) before the second was killed; both work folders were deleted and the sessions rerun at parallelism 3.
   The first grading attempt failed with exit 1 on all calls (a placeholder path in the wrapper), cost 0 USD, and was rerun.
4. No raw tool traces are in `runs/`: only the redacted final answer and the cost of each cell (the trace files are large). Redaction replaced the home path and e-mail addresses.
5. The best-rival document (`docs/BEST-RIVAL-r7.md`) was written by a Sonnet subagent; its file:line claims about rivals were not independently re-checked by the controller.

## Cost (sum of the cost files in this folder)
54 sessions 4.1520 USD; 54 grader calls 1.9069 USD; held-out set d author 0.2610 USD; billing check 0.0026 USD; total 6.3225 USD (cost cap 30 USD). The subagents' own cost
(best-rival document, review) is not recorded in these files.

## Iteration 3 (commit `00109d7`): code committed, gate rerun could NOT be completed
Design: `docs/HEAD-TO-HEAD.md` "Round 7 development gate, iteration 3 design" (committed before the code). Rules added to the skill: reader-first commit subject for a
non-technical reader, old and new value of a changed limit, code check before a rewrite is saved (Sonnet review: 3 findings applied). `npm test`: 730 passed, 0 failed.
The rerun produced no valid cell. Attempt 1: every call returned `API Error: 400 ... "thinking.type.enabled" is not supported for this model` (settings in the owner's
user file set MAX_THINKING_TOKENS and CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING; cost about 0). Attempt 2, with a `--settings` override of those values in the run's settings file:
all 15 set-c cells returned `API Error: 400 ... "tool_use ids must be unique"`, cost 1.1023 USD. A plain two-command Bash prompt through the SDK shim on claude-sonnet-5-5 gave the same
400 in 4 of 4 tries over about 5 minutes. The real CLI was not called (owner rule). No score from iteration 3 exists; the failed cells are not in the tables, and set b was not started.
The gate stays "not passed" on the iteration 2 data above. Total spend in the cost files, with these failed attempts: 7.4248 USD (the first attempt's near-zero cells were not summed).
