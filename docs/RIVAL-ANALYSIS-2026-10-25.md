# Rival analysis: why product-engineer does not lead on fresh tasks (2026-10-25)

Read-only research. No benchmark session, no `claude -p` call, and no product change was made for this report.
It reads the measured results of r9 final and r10 gates 1 to 3, the stored grader reasons, the session logs
of the graded cells, and the source of the three rival plugins.

## Summary

**Top three reasons (measured):**

1. **Our output rules were tuned to the public set's criteria. Fresh writers reward the opposite.** The public
   criteria reward "no function, file or variable names" (T1 c2), a list of banned identifiers (T4 c1) and split
   commits (H5 c3). Fresh writers reward the exact names (`maxItems` to `limit`, `retryLimit` to `maxRetries`,
   `MAX_ROWS` 5,000 against 10,000 in the docs, the name of the skipped test) and one message that covers the whole
   change. Ours lost on this one class in three independent writer sets: set d X3 (0/3), gate 3 X102 c1 (1/3),
   gate 3 X101 c3/c4 (0/3 each), and set d X1 c3 (0/3, split commits). One ours session states the cause in its
   own words: "The notes don't print either name, because customer notes can't contain code names" (gate 3
   X102-ours-3). This explains most of the drop from 62.33/63 on the public set to parity on fresh sets.
2. **The Stop hook does not change scores on average. It adds cost, and one family of it deletes content.**
   Over 108 ours cells in gates 1 to 3, blocked cells score +0.03 per cell against base on the same task, and
   unblocked cells score -0.03. Blocked cells cost 0.111 USD and take 10.1 turns. Unblocked cells cost 0.077 USD
   and take 6.4 turns. The `plain` family (`bin/claim-gate.mjs:50`, `:247`) starts on any prompt that contains
   "plain-language". It then tells the agent to delete each sentence with "no counterpart in the source". For a
   status report the agent writes itself there is no source, so the agent makes one from its own findings and
   cuts specifics (gate 3 X101-ours-2, X101-ours-3).
3. **The things that win are deterministic or literal. Most of our prose does not move the score.** Every rival
   and the bare model score within a few points of each other. Pooled over gates 1 to 3 (nine writers, 36 tasks,
   144 points): ours 117.33, base 117.67, iso-invoked 117.67, dod 113.00, dod-invoked 110.33. Ours gains where a
   check reads the repository state or the test run (X41 c4 failing test reported, X61 c2 unmerged branch not
   announced, X82 release committed with the secret left out). Ours loses where a prose rule overrides the
   literal request. The bare model has no prose rules, so it never loses that way.

**Recommendation:** redesign before gate 4. Gate 4 is not worth running now. The two gaps built since gate 3
address about 3 of 48 points on read tasks. The writer-to-writer spread is about 5 points of 48 and the paired
interval half-width is about 0.4 per cell, so a gate cannot show a gain of that size. The redesign is in section
5. Run gate 4 only after the redesign passes a free offline replay on the stored transcripts (section 5, step 0).

## 1. Sources and method

- Results: `bench/head-to-head/results/r9-final/` (SUMMARY.md, `heldout-d/grades`), `results/r10-gate1/`
  (`gate12/grades`, `d/grades`), `results/r10-gate2/grades-merged`, `results/r10-gate3/grades-merged`. Each grade
  file carries a pass flag and a one-line `why` per criterion. `labels.json` in each grade folder maps the
  anonymised id to `task-arm-run`. Only `outcome` criteria are counted (the task set's `labels.json`), the same as
  the gate.
- Session logs of the graded cells: gate 1 ours in `/private/tmp/pe-r10-archive/gate1/` (commit `07f47df`; the
  `ours` cells in `/private/tmp/pe-r10-gate-work/runs` are a later re-run at `e2d14b4` and were not graded), gate 1
  rivals in `/private/tmp/pe-r10-gate-work/runs`, gate 2 in `/private/tmp/pe-r10-gate2-work/runs` (ours `d9e2336`),
  gate 3 in `/private/tmp/pe-r10-gate3-work/runs` (ours `b736a0b`). Each cell has `out.jsonl`, `meta.json` and the
  final `repo/`.
- Rival source: `bench/head-to-head/arms/{dod,iso,gwc}` at the pinned commits in `bench/head-to-head/arms.json`
  (dod-guard `be038f7`, iso-24495 `5951eb7`, git-weekly-changelog `f0164c0`). No clone was needed.
- Small read-only Python scripts joined grades, labels and logs. They were not committed. Per cell they computed:
  outcome score, Stop-hook blocks ("Stop hook feedback" user turns), Skill-tool loads, `num_turns`,
  `total_cost_usd`, and tool calls before the first write or commit.

## 2. Scoreboard on fresh writers

| set (writers) | ours | base | best rival | spread of all 8 arms |
|---|---|---|---|---|
| r9 set d (1) | 11.33 / 20 | 12.00 | dod-invoked 13.67 | 11.33 to 13.67 |
| gate 1 (3) | 42.33 / 48 | 43.67 | base, dod 43.67/43.33 | 40.67 to 43.67 |
| gate 2 (3) | 41.00 / 48 | 38.33 | dod-invoked 38.67 | 36.67 to 41.00 |
| gate 3 (3) | 34.00 / 48 | 35.67 | iso-invoked 36.33 | 29.67 to 36.33 |
| gates 1 to 3 pooled | 117.33 / 144 | 117.67 | iso-invoked 117.67 | 110.33 to 117.67 |

Ours minus base per task, gates 1 to 3 (36 tasks): 17 tasks are exactly 0.00. The largest losses are X73 -2.00,
X23 -1.33, X102 -1.00 and X24 -0.67. The largest gains are X82 +1.33, X41 +1.00, X61 +0.67 and X84 +0.67. Ten of
the 36 tasks have every arm at 3.67 or more, so they cannot separate the arms.

## 3. Question 1: where ours lost points, who got them, and what they did differently

Per criterion: ours passes out of 3 runs, then the arm with the most passes. Reasons are quoted from the grade
files.

| task, criterion | ours | winner | what the winner did differently (evidence) |
|---|---|---|---|
| g3 X73 c1, c2 (Node floor to 20) | 1/3, 1/3 | base 3/3, 5 rivals 3/3 | Ours run 1: "scripts/check-node.js MIN_MAJOR was never bumped and is still 18". Ours searched with `node.{0,20}(18\|16)`, which misses `MIN_MAJOR = 18`, then committed after 5 turns. The test passed only because the constant was not changed. Base ran `cat` on the files, bumped the constant, saw the test fail, and fixed the test. |
| g3 X73 c4 (dependabot, `@types/node`) | 0/3 | dod-invoked 3/3 | dod-invoked ran `cat` on `.nvmrc`, the scripts, the test and every workflow before editing (its verify command makes it snapshot the repository first). Ours: "The dependabot ignore rule was left untouched and not flagged" (3 of 3). |
| g3 X102 c1 (rename `retryLimit` to `maxRetries`) | 1/3 | all 7 others 3/3 | Ours: "Notes never name retryLimit or maxRetries, only 'the retry setting has a new name'". Ours run 3 says why: "customer notes can't contain code names". The cause is the `notes` error `code a reader cannot follow` (`bin/notes.mjs:221`, at `b736a0b` line 218). Base: "Rename to maxRetries with the old name rejected and the error text shown". |
| g3 X101 c3 (row limit 5,000 against 10,000 in docs) | 0/3 | gwc, gwc-invoked, iso 3/3 | iso run 1 wrote the docs mismatch as its own bullet. Ours ran `git diff --stat` of the branch, not the code diff, and never opened `src/export.js`. Runs 2 and 3 were blocked by the `plain` family and cut sentences after `facts` ("I cut them down to the facts"). |
| g3 X101 c4 (named skipped test, permission TODO) | 0/3 | dod, iso 2/3 | iso: "The 10,000-row test is skipped ('flaky on CI')" and "Permission check is missing". Ours run 3: "Only a generic '1 skipped' count". The iso output style requires this: "Every defect named carries its evidence and effect, not only a count" (`arms/iso/output-styles/iso-24495.md:463`). The ours SessionStart brief printed "skipped or todo tests: none in tracked test files" (`bin/brief.mjs:155`), which is true for `main` only. |
| g3 X74 c4 (report the earlier failing test) | 1/3 | dod 3/3 | Ours runs 1 and 3: "It never ran the tests". dod's Stop gate runs the suite (`arms/dod/hooks/handlers/stop-gate.sh:59`), so each dod session sees the failure. |
| g3 X71 c1, c3 (ttl to ttlMs, values x1000) | 2/3 each | dod, dod-invoked 3/3 | Same pattern as X73: dod reads every file before it edits. |
| g1 X23 c2, c3 (unmerged branch, skipped tests) | 1/3 each | base 3/3 | Ours run 1 ran `git log --since=...` without `--all` and wrote "Projede ödeme koduna ait hiçbir dosya yok" (the project has no payment code). Base ran `git log --all` first. This led to the r10 rule "look at every branch". |
| g1 X24 c3 (docs commit that removed a check) | 1/3 | base 3/3 | Ours run 1 "does not tie it to the docs commit, saying it may be a side effect of the revert or merge". Base named commit `8d5204d` "docs: update readme". |
| g1 X11 c3 (commit message only about rounding) | 1/3 | base, 5 rivals 3/3 | Ours run 1 put an evidence line in the commit body: "Ran `npm test` with the unfinished tax.js change set aside: 4 passed, 0 failed." The criterion forbids a test-pass claim in the message. The skill asks for observed evidence, and the agent put it in the message. |
| g1 X31 c2 (tests at net 1050) | 1/3 | dod 3/3 | dod wrote invoice, quote and refund tests in 3 of 3 runs. Ours wrote "Only a vatCents test" in 2 of 3. |
| d X3 c3 (rename `maxItems` to `limit`) | 0/3 | all 7 others 3/3 | Same class as X102: "never names the old option maxItems, only 'its old name'". |
| d X1 c3 (one message covers three parts) | 0/3 | all 7 others 3/3 | Ours split the work into several commits ("one commit per unrelated group", `skills/product-engineer/SKILL.md:3`). Commit `07f47df` later added the one-commit rule. |
| d X4 c2, c3 (fix the duplicated floor) | 0/3 | dod-invoked 2/3 | dod-invoked fixed both copies. This led to `twins`. |

**Where ours gained (for contrast):** g2 X41 c4 (ours 2/3, base 0/3) reported the failing timeout test. g2 X61 c2
(3/3 against base 1/3) did not announce an unmerged feature. g3 X82 c1 to c4 (3/3 each). On X82, base, gwc and
dod did not commit ("There is no release commit"): base and gwc refused because the owner's claim was false, and
dod's stub gate stopped on a TODO in the owner's own WIP. Ours fixed the lockfile and committed only the named
paths. g3 X84 c2 (3/3 against base 1/3) left the WIP files out.

**Class count over the read losses:**

- (a) A rule removes a reader-needed name, number or detail: X101 c3 and c4, X102 c1, d X3 c3.
- (b) A rule changes the deliverable's shape: d X1 c3 (split commits), X11 c3 (evidence line in the message).
- (c) Too little reading of each file the change touches (dod wins these): X73, X71, d X4, X31.
- (d) Too little history inspection: X23, X24.

## 4. Question 2: what the rivals do structurally

| | ours (`b736a0b`) | dod-guard | iso-24495 | git-weekly-changelog | base |
|---|---|---|---|---|---|
| Instruction text | main skill 13.4 KB / 2,263 words, plus customer-block 953, done-means-observed 827, release-notes 1,041 words and 11 reference files | 4 skills plus 8 commands, 35.7 KB in total. `verify.md` has 373 words with a fixed report format | output style 23.8 KB / 3,667 words plus 7 skills | 1 skill, 474 words | none |
| How the text reaches the model | Skill tool, loaded in 54 of 108 ours cells (19, 14 and 21 of 36 in gates 1 to 3). The SessionStart brief is always loaded. | Skill or command. The invoked arm names `/dod:verify` | **Output style, always in the system prompt** (`arms.json` `settings.outputStyle`), so no extra turn | Skill | n/a |
| Hooks | SessionStart brief (`bin/brief.mjs`). PreToolUse Bash commit guard. Stop claim gate (`bin/claim-gate.mjs`) that reads the **answer text** and the tool events | SessionStart, PostToolUse edit and commit, SubagentStop. Stop gate that **runs the stub scanners and the test suite** when the session edited a file, and blocks on FAIL (`stop-gate.sh:44`, `:59`) | none | none | none |
| Enforced by code | secret unstaging, commit scope, claim families (tests pass, tests added, counts, plain rewrite, "nothing else uses"), CLI checkers that run only when the prose asks for them (`facts`, `notes`, `range`, `twins`, `claims`) | repository state: stub and TODO scan, empty functions, test run, a verify marker before a commit | nothing (rules only) | nothing | nothing |
| Plain-language technique | Remove identifiers. Explain a term in the reply, "never inside a rewrite" (SKILL.md:104 to 108). `notes` errors on identifiers. A rewrite adds no sentence the source does not have (SKILL.md:108). | n/a | **Keep identifiers, then explain them.** "Keep technical terms the reader's field expects; define the rest on first use" (`iso-24495.md:26`). "Define an identifier on first use, or leave it out" (`:42`). In the cells this gives a plain sentence with the name after it: "switched off by default (`bulkExport: false`)" (X101-iso-1). | grouped by theme. Read-only git, no tests run | none |
| How claims are verified | regex on the final answer against tool events. When something is missing it blocks once and asks for a restatement | runs the suite and the scanners itself, and requires a fixed report (test counts, VERDICT) | self-check list: "Separate built from verified", "Every defect named carries its evidence and effect, not only a count" (`:447`, `:463`) | none | none |
| Turns per session (g1 / g2 / g3) | 7.2 / 8.6 / 7.4 | dod 7.3 / 10.5 / 8.0, invoked 7.9 / 10.5 / 8.5 | iso 4.6 / 5.9 / 4.8, invoked 8.9 / 10.7 / 9.4 | 4.7 / 6.1 / 4.4 | 4.6 / 5.9 / 4.5 |
| USD per session (g1 / g2 / g3) | 0.074 / 0.104 / 0.089 | 0.083 / 0.122 / 0.104, invoked 0.095 / 0.127 / 0.113 | 0.056 / 0.078 / 0.066, invoked 0.089 / 0.116 / 0.101 | 0.055 / 0.076 / 0.060 | 0.052 / 0.073 / 0.061 |
| Tool calls before the first write or commit (g1 / g2 / g3) | 2.42 / 3.47 / 2.86 | invoked 2.89 / 4.78 / 3.47 | invoked 2.31 / 3.33 / 2.78 | n/a | 2.25 / 3.25 / 2.28 |

Points from the table:

- The cheapest strong rival is the iso output style without the invoke prefix: 4.8 turns, 0.066 USD and 34.67
  in gate 3. Its rules are always present and need no Skill-tool turn.
- dod spends its extra turns **before** writing (1 to 1.5 more reads than base). Ours spends its extra turns
  **after** writing: about 2.9 tool calls after the first write against about 1.3 for base, on checkers, blocks
  and restatements. dod wins the multi-file tasks (X73, X71, d X4, X31). Ours does not.
- dod's code gate also loses points. It runs on the whole tree, so the owner's WIP fails it: g3 X82 dod 0.00 and
  dod-invoked 0.00, X81 dod 2.33 and dod-invoked 1.00. A gate on repository state needs a scope.

## 5. Question 3: why the bare model ties us on fresh writers

### Measured facts

1. **The public set and the fresh sets reward opposite output styles.** Public criteria (`tasks.json`) T1 c2
   ("no function, file or variable names"), T4 c1 (a list of banned tokens, including `toCsv` and
   `dueReminders`) and H5 c3 ("at least two new commits") match our rules one to one. Fresh writers reward names
   and single messages (section 3, classes a and b). The public lead (62.33 against 48.33) and the fresh parity
   are the same product measured with criteria of two styles.
2. **Blocks do not change the score on average.** Ours minus base on the same task: blocked cells (39) +0.03,
   unblocked (69) -0.03. Per gate, blocked cells: -0.09 (11 cells), +0.25 (20), -0.33 (8). The sign is not
   stable. Blocks raise cost: 0.111 against 0.077 USD per cell, and 10.1 against 6.4 turns. (My block counts are
   11, 20 and 8. The gate 2 summary reports 18, because it counts differently.)
3. **One block family removes content.** The `plain` family starts on the word "plain-language" in any prompt
   that is followed by a write (`claim-gate.mjs:247`). It requires `facts` and the deletion of "no counterpart"
   sentences, which is a rule for licence rewrites (H6). For an authored status report (X101) it made the agent
   build a source file from its own findings and then cut sentences. Both blocked X101 runs failed c3 and c4.
4. **The skill text is absent in half of the sessions.** It loaded in 54 of 108 cells. Cells with the skill:
   +0.10 against base on the same task. Cells without it: -0.12. This is weak evidence: n = 54 each, and task
   type decides whether the model loads the skill.
5. **The bare model is near the ceiling.** It scores 91, 80 and 74 percent in gates 1 to 3. 17 of 36 tasks give
   ours exactly the base score.
6. **The brief can mislead.** In gate 3 the brief listed the unmerged branch, but it also printed "skipped or
   todo tests: none". That line covers the tracked test files on `main` only, while the skipped test was on the
   branch. Ours did not name the skipped test in 3 of 3 X101 runs. That this line caused the omission is a
   hypothesis (see H3).

### Hypotheses (not measured)

- **H1, the main one:** the product's prescriptive output rules (customer block, no identifiers, one commit per
  group, evidence in the message, no unsupported sentence) give points only when the criteria were written by
  someone who shares them. A fresh writer judges against the literal request. Each rule then has one side
  that can only lose against the bare model. Test without sessions: re-score the stored ours cells as if each
  rule were removed. That is not possible exactly. A cheaper proxy: count how many fresh-writer criteria each
  rule can violate against how many it can satisfy.
- **H2:** the post-write verification loop moves attention from "is the deliverable complete" to "does the text
  pass the checker". Evidence: the turn split in section 4, and the X101 and X102 runs that report checker
  results at length while they miss facts that base found.
- **H3:** "none" lines in the brief make the model stop searching (X101 c4). Test by replaying the brief on the
  stored fixtures and counting the lines whose scope is narrower than their wording.
- **H4:** the gains we have (X41, X61, X82) are rules that match the literal request (report the real test
  state, do not announce unmerged work, commit when told). These are general.

### Answers to the three sub-questions

- **Is the skill steering wrong?** Partly, yes. The plain-language and notes rules steer against names that
  readers need, and the rewrite rule is applied to authored reports. This is measured on 4 criteria in 3
  writer sets. The remaining steering (honest test state, unmerged work) is right and gains points.
- **Does the Stop-hook block cost points or only cost?** On average it costs money, not points (fact 2). The
  `plain` family costs points on authored plain-language reports (fact 3).
- **Do the grading criteria reward something our skill suppresses?** Yes. They reward exact names, numbers,
  named tests and TODOs, and one message that covers the whole change. The identifier rule and the
  split-commit rule suppress these (section 3, classes a and b).

## 6. Question 4: design implications, ranked

These are general rules. None names a fixture, task, file or value of a read task.

1. **Keep the names and numbers that the reader must act on, and explain each in plain words.** Change the
   default in `notes` and the skill from "remove identifiers" to "a plain sentence first, then the exact name".
   A setting, option, flag, command, limit, version or test that the reader must type, change or check is never
   removed. The checker warns only about identifiers that are internal and not actionable. iso does this, and
   iso wins the class. Expected effect: removes class (a), the only loss class seen in three writer sets.
2. **Scope the `plain` claim family to rewrites that have a source.** Start it only when the request gives a
   text to rewrite (a file or quoted passage to convert). Do not start it for an authored status, notes or
   summary. For authored text, ask for the opposite check: each finding in the investigation (failing or
   skipped test, TODO, mismatch between docs and code, unmerged branch) appears in the text by name.
3. **Put output-shape rules under the request, not over it.** Split commits, the customer block, and evidence
   lines in the message apply only when the request does not already define the deliverable. "Commit it" means
   one commit unless the change is clearly unrelated. A commit message holds no test-pass line, because test
   evidence goes in the answer. This removes class (b).
4. **Do the reading before the writing, and enforce it with code, not prose.** dod's advantage is a forced
   snapshot before edits. A change that edits a value (a version, a limit, a renamed key) runs `twins` and the
   stale-value search **before** the first edit. The search then gives the file list to edit, instead of a
   check on the result afterwards. Do the same for status and PR text: `range` and a branch list run before the
   first write. This removes class (c) and moves our extra turns to where dod's are.
5. **Move the short, general rules to always-on context and shorten the skill.** The skill loads in half of the
   sessions, but the brief loads in all of them. Put about 10 lines of always-true rules in the SessionStart
   output: report the real test state, look at every branch, keep actionable names, one commit unless clearly
   unrelated, do not announce unmerged work. Keep the long skill for the cases that need it. iso shows that an
   always-on text costs fewer turns than a Skill-tool load.
6. **The brief must never print "none" for a scope it did not search.** Say "none on the current branch" or
   list every branch. A narrow "none" line is worse than no line.
7. **A repository-state gate needs a scope (a lesson from dod).** Any test or stub gate that is added runs on
   the files the session changed. The owner's WIP never blocks a commit.
8. **Cost:** items 2 and 5 also remove turns: fewer `plain` blocks, and no Skill-tool turn for the general
   rules. Gap 3 measured the Skill load at +0.014 USD and a block at +0.044 USD per cell. No separate cost work
   is needed.

### Gate 4 now or redesign first?

**Redesign first.**

- The two gaps built after gate 3 (stale values, removed names allowed in customer notes) cover X73 and part of
  X102. That is at most about 3 points of 48, and on read tasks.
- The paired interval half-width is about 0.4 per cell (gate 3: -0.58 to +0.22). Between gates the totals of
  the same arm move by about 5 points of 48. A gate of 36 cells cannot show a gain of 3 points.
- Items 1 to 3 above change behaviour on loss classes seen in several writer sets. Item 1 also acts on the
  class that separates the public result from the fresh results.

Order:

0. **Offline replay, no sessions:** run the changed `claim-gate`, `notes` and `brief` on the stored transcripts
   and answers of gates 1 to 3 (the replay script in `bench/head-to-head/tools/` already exists for false
   blocks). Count how often the new code would still remove an actionable name, start `plain` on authored
   text, or print a narrow "none". Continue only if each count is zero on the stored cells and the existing
   tests pass.
1. Then gate 4 with three new writers, the frozen rule unchanged, and a written expected gain stated before the
   run. If the expected gain is still smaller than the interval half-width, the owner's rule ("measure only when
   first place is nearly certain") says to describe the product by what it measurably does instead.

## 7. Limits of this analysis

- All loss diagnosis uses tasks that are now read material. The implications are written as general rules,
  but no claim of improvement can come from this report.
- The grader reasons are short, and one vote can disagree with the session log. For example, gate 1 X11-ours-2
  was marked as mentioning tax in the message, but the stored commit message does not. The merged grade is the
  majority of five votes, and single criteria can be noise.
- "Tool calls before the first write or commit" counts a `cat >` heredoc as a write. That includes scratch
  files, so the split is approximate.
- n = 3 runs per cell. Single-criterion differences of 1 in 3 are within run-to-run variation (F6-runs in r9: 15
  of 17 held-out re-runs fell inside the original min-max).
