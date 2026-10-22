# Round 6 result: held-out set Y (X1 to X5), 11 arms, 3 runs, 2026-10-22

**Result in one sentence.** On five new held-out tasks written by a fresh Sonnet session that saw only the README's user-problem sentence
(X1 to X5; 11 arms x 3 runs = 165 sessions; `claude-sonnet-5-5`; Claude Code 2.1.308 through the Claude Agent SDK; macOS; 2026-10-22;
graded by three joint Sonnet votes per task, majority per criterion), `ours` scored 19.67 of 20 outcome points against 20.00 for eight
other arms (base, gwc, gwc-invoked, dod, dod-invoked, iso, iso-invoked, sp-invoked), so Rule B fails (X3) and Rule A fails (we lost 0.33
points, the best other arm lost 0.00), the held-out gate is **not passed**, nothing here supports a "first" claim, and the set does not
separate the arms because all eleven arms scored 19.00 or more.

Protocol: `PROTOCOL.md` (frozen in commit `a3c469d` before the first scored session; its product commit is `5d0cb0c`, diagnosis and hook
decision in `3314d7d`). Product under test: the git archive of `a3c469d` (product files equal `5d0cb0c`). No cell was reused.

## Tables (recomputed by `score.py`; this block equals its output byte for byte, `python3 -I score.py --check`)

<!-- score.py output begin -->
votes read: 3; graded runs: 165; complete tasks: X1, X2, X3, X4, X5

Outcome score per task (mean over runs of passed outcome criteria; runs in brackets):

| arm | X1 | X2 | X3 | X4 | X5 | total (complete tasks) |
|---|---|---|---|---|---|---|
| ours | 4.00 [4/4/4] | 4.00 [4/4/4] | 3.67 [3/4/4] | 4.00 [4/4/4] | 4.00 [4/4/4] | 19.67 |
| base | 4.00 [4/4/4] | 4.00 [4/4/4] | 4.00 [4/4/4] | 4.00 [4/4/4] | 4.00 [4/4/4] | 20.00 |
| gwc | 4.00 [4/4/4] | 4.00 [4/4/4] | 4.00 [4/4/4] | 4.00 [4/4/4] | 4.00 [4/4/4] | 20.00 |
| gwc-invoked | 4.00 [4/4/4] | 4.00 [4/4/4] | 4.00 [4/4/4] | 4.00 [4/4/4] | 4.00 [4/4/4] | 20.00 |
| dod | 4.00 [4/4/4] | 4.00 [4/4/4] | 4.00 [4/4/4] | 4.00 [4/4/4] | 4.00 [4/4/4] | 20.00 |
| dod-invoked | 4.00 [4/4/4] | 4.00 [4/4/4] | 4.00 [4/4/4] | 4.00 [4/4/4] | 4.00 [4/4/4] | 20.00 |
| iso | 4.00 [4/4/4] | 4.00 [4/4/4] | 4.00 [4/4/4] | 4.00 [4/4/4] | 4.00 [4/4/4] | 20.00 |
| iso-invoked | 4.00 [4/4/4] | 4.00 [4/4/4] | 4.00 [4/4/4] | 4.00 [4/4/4] | 4.00 [4/4/4] | 20.00 |
| ce | 3.00 [3/2/4] | 4.00 [4/4/4] | 4.00 [4/4/4] | 4.00 [4/4/4] | 4.00 [4/4/4] | 19.00 |
| sp | 4.00 [4/4/4] | 3.67 [4/4/3] | 4.00 [4/4/4] | 4.00 [4/4/4] | 4.00 [4/4/4] | 19.67 |
| sp-invoked | 4.00 [4/4/4] | 4.00 [4/4/4] | 4.00 [4/4/4] | 4.00 [4/4/4] | 4.00 [4/4/4] | 20.00 |

Process criterion (not part of the rules), mean passed per run:

| arm | X1 | X2 | X3 | X4 | X5 |
|---|---|---|---|---|---|
| ours | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 |
| base | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 |
| gwc | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 |
| gwc-invoked | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 |
| dod | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 |
| dod-invoked | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 |
| iso | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 |
| iso-invoked | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 |
| ce | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 |
| sp | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 |
| sp-invoked | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 |

Rule B (ours strictly above every other arm; at the maximum if another arm is):

- X1: pass (ceiling case: best other base 4.00 = max 4; ours 4.00)
- X2: pass (ceiling case: best other base 4.00 = max 4; ours 4.00)
- X3: FAIL (ceiling case: best other base 4.00 = max 4; ours 3.67)
- X4: pass (ceiling case: best other base 4.00 = max 4; ours 4.00)
- X5: pass (ceiling case: best other base 4.00 = max 4; ours 4.00)
- Rule B over complete tasks: fails

Rule A (our lost points <= 80% of the best other arm's lost points, complete tasks):

- maximum over complete tasks: 20; ours lost 0.33; best other arm base lost 0.00; limit 0.8 x = 0.00
- Rule A: fails

Gate on this set: does not pass
<!-- score.py output end -->

## What the numbers show and do not show

- The tasks were not hard for the bare model: `base` scored 4.00 on all five tasks, three runs each (20 of 20 outcome points per run
  set). The single point `ours` lost is X3 run 1, criterion 1, failed by all three votes ("The notes describe JSON output but never
  name the --json flag");. One lost point in 15 sessions is
  within what run-to-run variance can produce; this round cannot tell variance from a real weakness (3 runs per cell).
- `ce` lost 1.00 point on X1 (its runs scored 3, 2 and 4 of 4) and `sp` lost 0.33 on X2. So the plain model and most rivals are at the
  ceiling; the benchmark family on this set measures "does not fail", and `ours` does not beat it there. A claim that product-engineer
  is better than plain Claude does not follow from these tables. The earlier deep-round held-out result (X2 win, X3 loss, a different
  set) is a different set and is not combined with this one.
- The process criterion is 1.00 for every arm and task, so it does not discriminate either; it is reported only.
- Per-session cost, mean of 15 sessions (`ev/cost.tsv`, sum of `total_cost_usd`): ours 0.0737, base 0.0587, gwc 0.0558, gwc-invoked
  0.0581, dod 0.0812, dod-invoked 0.0904, iso 0.0551, iso-invoked 0.0760, ce 0.0654, sp 0.0689, sp-invoked 0.0680 USD. Ours costs
  about 0.015 USD more per session than base; the table above gives no outcome gain for it.
- The hook change did what the diagnosis said it should: the claim check blocked 7 of 15 `ours` sessions once each (X2 runs 1 to 3, X3
  run 3, X5 runs 1 to 3, counted in the raw `out.jsonl` of each session by the block text "claim check (one-time)" in a user message), and all 7
  final answers (1,447 to 2,360 characters) describe the deliverable and carry the correction inside. The removal condition set in
  `3314d7d` (a final answer that omits the deliverable) did not occur in this round; all 7 sessions scored 4 of 4.
- Language: `ours` X5 run 1 answered in German although the prompt was English (the machine's user-level settings are loaded by
  all arms; the answer language of the other 164 cells was not audited).

## Gate steps after the held-out set

Rule A and Rule B did not hold, so by protocol: the public 13-task re-measurement, F9 (Haiku, Opus) and F6 (10 percent re-grade by an
agent that has not seen the code) were **not run**. They would not have fitted the 25 USD cap in any case (public set about 43 USD).

## Departures from the frozen protocol and incidents (all of them)

1. **First grading attempt failed before any grader call.** The SDK shim ignores piped stdin when `-p` has a prompt argument (the CLI
   appends stdin to it), so the grader material was lost and `spawnSync claude` returned EPIPE (all 15 calls of the first two
   attempts, cost 0 USD). Fix: `grader-wrapper.sh` puts the `-p` prompt behind the stdin material and calls the same SDK shim. The
   grader prompt, model, material and settings are unchanged. Second incident of the same step: the shim had meanwhile gained an
   `ACTIVE_KEY` file read relative to `$HOME`, which the throw-away HOME of the grader did not have; a symlink to that key file was put
   in the throw-away HOME (no key was copied or written to the repository). Then all 15 grader calls succeeded on the first attempt.
2. **Key switch during the run.** The shim's `ACTIVE_KEY` points to a second key file (own ledger and limit). The 165 sessions started
   at 23:00; whether `ACTIVE_KEY` already existed then, and which key served which session, was not checked and is not in this
   folder (the shim ledgers hold the costs per key file). The Haiku billing check before the run showed `apiKeySource`
   ANTHROPIC_API_KEY; the key after the switch was not checked with an init event.
3. **Parallelism 3** as the protocol says (HANDOFF text of older rounds says 2).
4. **Rivals' license:** gwc has no LICENSE file in its pinned checkout; it is run unmodified from a copy, no code is taken.
5. The diagnostic sessions (8, one `ours` per held-out set B task with and without `PRODUCT_ENGINEER_NO_GATE=1`, commit `c10fc6a`,
   before the fix) are in `diagnosis/`, not scored, and not part of any table.
6. No cell was rerun, no stop rule fired (session cost 11.27 USD of 19.0), no 429, no credit-guard exit, no authentication error.

## Cost of the round

Cost file `cost.tsv` (every `claude -p` call, including diagnosis, author, grading, billing check): total 14.97 USD of the 25 USD cap.
Sessions 11.27 USD (165), grading 2.89 USD (15 calls), diagnosis, author and billing check the rest. The controller session itself is
accounted separately by its own budget (cap 6 USD).
