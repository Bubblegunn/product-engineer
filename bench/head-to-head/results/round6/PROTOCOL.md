## Round 6 measurement protocol (frozen 2026-10-22, owner decision, before any scored session of this round)

Written and committed before any scored session; not changed after a result is seen.

**Product under test.** Commit `5d0cb0c` (hook change, snapshot rule, two skill rules; its parent `3314d7d` carries the diagnosis and
the decision). `ours` runs from an immutable `git archive` copy of the commit that carries this protocol; the protocol commit changes
no product file. The product does not change after the held-out set below is first run.

**Held-out set (new, never run).** Five tasks X1 to X5, written by a fresh Sonnet session (Agent SDK path, `--setting-sources
project`, empty directory, no user settings or memory) whose whole prompt was: the user-problem sentence from the README
("My coding agent's commit message says it added tests, and the change has none."), one sentence on what the tool does, the file
format (fixture script, `task.json` with exactly five criteria, four `outcome` and one `process`, `ground-truth.md`) and the rules
"Node only, no network, the five tasks differ in kind, one realistic trap each, do not reveal the trap". It saw no code, no
`HEAD-TO-HEAD.md`, no research report, no earlier held-out task and none of our loss classes. The prompt is stored in the result
folder. The controller did not read the tasks before the run (`heldout-prep.mjs` prints counts only: 5 tasks, 25 criteria, 20
outcome). Local branch `heldout-2026-10-c` (not pushed). The earlier set `heldout-2026-10-b` is read and is not used for any score.

**Arms (11), 3 runs each, every cell new on the Agent SDK path, no reuse:** `ours`, `base` (empty plugin), `gwc`, `gwc-invoked`, `dod`,
`dod-invoked`, `iso`, `iso-invoked`, `ce` (compound-engineering `738067a`), `sp` (superpowers `2ce8aa1`), `sp-invoked`. Pinned
commits and prefixes are in `bench/head-to-head/arms.json`; rival code runs only from the fetched pinned copy, with the hooks and
mcpServers guard before and after every call; Vaara is never run. `ce-invoked` is not in this round (owner list). Model
`claude-sonnet-5-5`, Claude Code 2.1.308 through `claude_agent_sdk.query()`, macOS, parallelism 3, key billing.

**Order and stops.** Task by task X1 to X5; within a task all 11 arms; 165 sessions. Sessions cost about 0.1 USD each. No new session
starts once the sum of this round's session costs reaches 19.0 USD, none of any kind once the round's cost file reaches 24.0 USD, and
none when the credit guard of the shim refuses a call (exit 3), a call returns HTTP 429 or an authentication error (stop and report).
A cell not run is reported as not run; a task with an incomplete arm set is not part of Rule A or Rule B and is listed as incomplete.

**Grading.** Per task, all sessions of the task in one anonymised call in shuffled order (`grade.mjs --joint`, Sonnet, no plugins,
no scripted criteria). Three independent votes per task (seeds 1, 2, 3, so a different shuffle and different labels); a criterion
passes when at least 2 of 3 votes pass it; parse failures are retried once by `grade.mjs`, and a vote that stays unparsable is
dropped and reported. Score = number of passed outcome criteria out of 4 per task, mean over the 3 runs (outcome-only; process
criteria reported separately). The recomputation script `score.py` in the result folder reads only the stored votes.

**Win rule (HANDOFF-CLOUD, binding).** Rule B: on every task, the mean of ours is strictly above the mean of every other arm; where
another arm is at the maximum of 4.00, ours must be at 4.00 too (ceiling case). Rule A: our lost points (4 per task times the number
of tasks, minus our total) are at most 80 percent of the best other arm's lost points. A task where every arm scores 4.00 is
saturated; it is reported, it cannot be replaced in this set, and it counts as a ceiling case. Competitor = better of its plain and
invoked arm; strictly above both is the same as strictly above the better one.

**Next gate steps.** Only if Rule A and Rule B pass on the held-out set: the public 13 tasks with `ours` x3 and all arms x3
(429 sessions, about 43 USD at 0.1 USD each). That is above the owner's 25 USD cap for this round, so it is not run unless the
remaining cap allows it, which the cost above says it does not; then it is reported as not run, and F9 (Haiku and Opus, one session
per task, `ours`, the best rival arm and `base`) and F6 (10 percent re-grade by an agent that has not seen the code) are also not run.
Stated before the run: a held-out pass alone is not "first"; the claim needs the full gate and carries its scope.

**Known differences, recorded.** SDK path versus CLI path: no `Artifact` tool and no `artifact-diagramming` skill on the SDK path; the
tasks do not use them. The ours session reads the owner's user-level CLAUDE.md like every arm (the harness sets HOME to a throw-away
directory; whatever it loads is the same for all arms).
