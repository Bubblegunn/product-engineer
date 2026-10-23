# dod-guard capability table vs product-engineer (pe)

Rival: dod-guard, MIT, (c) 2026 Atos Daniel de Assis Lins (LICENSE:1-3). Read at
`<REPO>/bench/head-to-head/arms/dod` (call it D/). Nothing was executed except one
`bash -c` line that shows a shell rule (see Defect 1). Every file in D/ is under that one MIT licence, so the licence column says
"MIT-A" (Atos) for rival files. Ours: `<REPO>` (call it P/), MIT, (c) Efe Genc.
Our THIRD_PARTY_NOTICES.md:46-58 already credits dod-guard at commit be038f7 for `bin/stubs.mjs` pattern families only. Adapting any more
rival text or code needs a new notice entry. A reimplemented idea needs none.

Our hooks today (P/hooks/hooks.json:1-27): Stop -> claim-gate.mjs, PreToolUse(Bash) -> commit-guard.mjs. That is all. No PostToolUse, no
SessionStart, no SubagentStop. `P/bin/stubs.mjs` exists but nothing calls it automatically; it is a command only.

Reading key: yes / partly / no for "do we have it". Evidence = file:line I read.

## A. Hooks (D/hooks/hooks.json:1-62)

| capability | what the user gets | how implemented (D/) | do we have it | where it beats ours | licence | adopt? |
|---|---|---|---|---|---|---|
| PostToolUse stub check on every edit | After each Write/Edit/MultiEdit/NotebookEdit the agent is told at once about TODO/stub markers in that file; block or warn by config | hooks.json:15-25 matcher; hooks/handlers/post-edit.sh:44-48 reads `.hooks.post_edit.severity` (default warn), :51 runs detect-stubs on the one file, :72-87 emits `{"decision":"block"}` or `{"systemMessage"}` | partly: P/bin/stubs.mjs:281-390 scans a change, but no hook runs it (P/hooks/hooks.json) | Feedback arrives at the moment of the edit, not at commit or Stop. Ours is on request only. | MIT-A | reimplement idea: node PostToolUse hook calling `scanAdded()` on the edited file's new lines, default warn |
| Commit gate on `git commit` | Commit is refused when stubs are staged or the verify marker is old | hooks.json:26-35 registers it as **PostToolUse**(Bash); pre-commit.sh:31-34 matches `*"git commit"*`; :62-71 stubs in diff; :74-84 marker age | partly: P/bin/commit-guard.mjs is PreToolUse(Bash) (hooks.json:16-26) and checks secrets, conflict markers, junk paths (commit-guard.mjs:26-31), not stubs or tests | Rival gates on stubs and test freshness. Ours gates on secrets. We beat it on timing (see Defect 2). | MIT-A | reimplement idea: add a stub pass and a freshness pass to commit-guard (PreToolUse, so it can deny before the commit runs) |
| `--no-verify` ban | Commit with `--no-verify` is blocked outright | pre-commit.sh:36-43 | no (grep of P/bin finds no `no-verify`) | Closes the easiest way around a git hook. Cheap. | MIT-A | reimplement idea: 3 lines in commit-guard `parseCommand` |
| Stop gate | Agent cannot end a turn while the pipeline fails | stop-gate.sh:25-32 `stop_hook_active` loop guard; :34-49 skip when transcript has no Write/Edit; :59 run pipeline; :65-69 PASS writes marker; :77-91 emits block with 4 next steps | partly: P/bin/claim-gate.mjs:171-181 (same loop guard, same block JSON, blocks at most once) but it checks claims vs session events, not code state | Rival checks the code (stubs, tests). Ours checks only the words. Ours beats it: one block per session, event-level evidence (claim-gate.mjs:62-70, 122-160), no test run in the hook so it stays at the 15 s timeout (hooks.json:11 vs rival timeout 300 at hooks.json:44) | MIT-A | reimplement idea: let claim-gate also fail "done" when `stubs --range` over this turn's writes is non-empty |
| SessionStart context injection | DoD rules and config summary appear in the agent's context at session start | session-start.sh:21-23 no-op without config; :36-40 jq summary; :47-53 embeds DOD.md; :56-62 `hookSpecificOutput.additionalContext` | no | Puts the project's own done-definition in context without the agent choosing to load a skill. | MIT-A | skip: P skills already load by description; extra context costs tokens every session |
| SubagentStop recorder | Each subagent's final output is saved as JSON under `.dod-guard/reports/<session>/` | subagent-stop.sh:28-36 path and collision rename; :41-55 envelope with timestamp | no | Gives the final judge a disk trail. Only useful with the 7-agent audit. | MIT-A | skip: needs the subagent pipeline we do not have |

## B. Deterministic detectors (D/scripts)

| capability | what the user gets | how implemented | do we have it | where it beats ours | licence | adopt? |
|---|---|---|---|---|---|---|
| Stub/TODO/FIXME/XXX/HACK markers | List of marker lines with severity | detect-stubs.sh:24-36 pattern table (11 types incl. `placeholder_string`, python `...` body, go `nolint`); :109-133 `grep -nE` per pattern, 100-match cap | yes: P/bin/stubs.mjs:300-304 `COMMENT_MARKER`; scans **added lines only** (stubs.mjs:3-4) | Rival also flags `HACK`, `"placeholder"`, `nolint`. Ours is better on scope: added lines only, comment-aware masking (stubs.mjs:111-204). Rival scans whole files, so old TODOs fail a fresh change (pipeline uses `--all`, run-verification-pipeline.sh:71). | MIT-A | skip (ours is a superset in precision); optional: add `HACK` and `nolint` as warn codes |
| Not-implemented markers | `raise NotImplementedError`, `panic("not implemented")`, `todo!()`, `throw new Error('not implemented')` | detect-stubs.sh:29-32; check-not-implemented.sh:37-40 | yes: stubs.mjs:305-308, 360-366 | Parity. | MIT-A | skip |
| Empty function bodies, **AST for Python** | `def f(): pass` / `...` / `return` / `return None` / docstring-only / `raise NotImplementedError`, found by parsing; `@abstractmethod`/`@overload` exempt | detect-empty-functions.py:74-102 trivial-body test; :105-128 `ast.walk`; :117 decorator exemption; :161-183 regex for JS/Go/Rust/Ruby | partly: stubs.mjs:309-327 matches one-line and two-line empty bodies by regex, JS and Python only (stubs.mjs:228-280 `jsBody`/`pyBody` is for tests) | AST sees multi-line and docstring-only bodies and knows abstract methods; ours only sees what fits on two added lines. Rival misses Java/Kotlin (SOURCE_EXTS lists them at :41-50 but `scan()` :208-220 returns [] for them). | MIT-A | reimplement idea: a `python3 -I -c` AST helper is NOT zero-dep Node; instead extend `pyBody` to docstring-only and `return None` bodies. Skip the AST. |
| Suspicious returns | Function named like an action (`create_user`, `fetch_x`) that only returns None/{}/[]/""/0/False | detect-suspicious-returns.py:44-60 verb list and `looks_like_action`; :84-105 every `Return` is an empty literal; :108-128 Python only via AST; JS regex :131-; Go :213- | no (grep `suspicious`/`ACTION_VERBS` in P/bin: 0) | Catches the stub that has real-looking code (`return {}` in `save_order`). Ours only catches placeholder returns (`PLACEHOLDER_RETURN`, stubs.mjs:306-308) and empty bodies. This is the main detector we lack. Weak point: `any(v in norm ...)` (:60) matches the verb anywhere in the name, so `get_default_empty` style getters give false positives. | MIT-A | reimplement idea: see item 2 in the ranking |
| Test tautology / decorative asserts | `expect(x).toBeDefined()`, `.not.toBeNull()`, `expect(1).toBeTruthy()`, `toEqual(a,a)`, `expect.assertions(0)`, empty snapshot, chai `.to.exist`, `toHaveBeenCalled()` with no args, Python `assert True`, `assert x is not None` alone, Go `assert.True(t,true)`, `assert.Equal(t,x,x)`, `NoError(t,nil)` | detect-test-tautology.py:86-103 JS table; :105 toEqual same-side; :146-158 Python asserts; :189-216 body of **only** trivial asserts; :227-236 Go table; :255-310 Go test with no assertion-like call by brace matching | yes mostly: stubs.mjs:331-390 (`ASSERT_LITERAL_*`, `SAME_EXPECT`, `ZERO_ASSERTIONS`, `no-assertion` via `jsBody`/`pyBody`) | Rival has weak-assertion list ours lacks: `toBeDefined`, `.not.toBeNull`, `toHaveBeenCalled()` bare, chai `exist`, empty snapshots, Go tautologies and Go no-assertion bodies. Ours has `FOCUSED` `.only`, `XFAIL`, JUnit `@Disabled` (stubs.mjs:349-359) that rival lacks. | MIT-A | adapt idea: add 4 weak-assertion codes (weak-defined, bare-called, empty-snapshot, go-tautology) as warn, not error: `toBeDefined()` is often legitimate |
| Skipped tests | `test.skip`, `xit`, `xdescribe`, `@pytest.mark.skip`, `t.Skip` | detect-test-tautology.py:106-111, 161-175, 239 (warn) | yes: stubs.mjs:341-363 plus `.only`, xfail, `#[ignore]` | Ours covers more (focused tests, xfail). | MIT-A | skip |
| Diff-only mode | Restrict detectors to the files in the git diff | detect-stubs.sh:77-90; tautology `--diff` :342; detect-todos.sh:34- awk over added lines | yes, better: stubs.mjs:435-466 `scanChange` supports `--staged`, `--range`, untracked files | Ours reads added **lines**; rival `--diff` reads whole changed files (detect-stubs.sh:83-89). | MIT-A | skip |
| Exemption globs and monorepo scope | Per-project path exclusions and `scope.roots` | lib/exemptions.py:81-102 `is_exempt`; :47-58 scope; env bypass `DODG_NO_EXEMPTIONS` :41, `DODG_NO_SCOPE` :54 | partly: stubs.mjs skips doc paths only (stubs.mjs:283-285). No per-project exemption list | Needed once a hook fires automatically: the rival had to exempt its own scripts (D/.dod-guard.json:63-89) because the detectors flag themselves. | MIT-A | reimplement idea: `.product-engineer.json` key `stubs.exempt` (P/bin/headings.mjs:12 already reads that file) |

## C. Test running and regression

| capability | what the user gets | how implemented | do we have it | where it beats ours | licence | adopt? |
|---|---|---|---|---|---|---|
| Test runner autodetect and structured result | Runs pytest/jest/vitest/npm test/go/cargo; returns JSON `{runner,passed,failed,skipped,duration_ms,exit_code}` | run-full-suite.sh:23-41 detect; :55-62 commands; :75-98 count parsing; :104 JSON | no (our claim-gate only checks that a test command **ran**: claim-gate TEST_RUN regex, used at claim-gate.mjs:143-150) | We observe a test run in the transcript but never run or parse one, so we cannot say "12 passed 1 failed". | MIT-A | reimplement idea: item 3 in the ranking. **Do not copy the exit-code handling: Defect 1.** |
| Verify marker with TTL | Commit allowed only if verify passed in the last N seconds (default 600) | stop-gate.sh:65-68 and verify.md:53-55 write `date +%s` to `.dod-guard/last-verify-passed`; pre-commit.sh:75-83 age via `stat`; TTL key `hooks.pre_commit.verify_ttl_seconds` (templates/dod-guard.json.template:81) | no | Stops "tests passed an hour ago, then I edited". Ours has the same idea per turn ("after your last edit", claim-gate.mjs:147-150) but no on-disk marker. Rival marker is forgeable: the agent is told to write it (verify.md:53-54), so any `date > file` satisfies it. | MIT-A | reimplement idea with a fix: bind marker to `git write-tree` hash + test command + exit code, written only by our script (item 4) |
| Coverage delta vs baseline | Reports current coverage, baseline, delta; baseline file `.dod-guard/baseline.json` | coverage-delta.sh:48-77 extraction (pytest-cov, jest, vitest, go -cover); :91-98 delta; :101-109 `--update-baseline`; tolerance key `coverage_drop_tolerance` (config :34) | no | Detects a green suite that quietly lost coverage. Best effort; fixed `/tmp/dodg_cov.log` path (:53) is shared and predictable. **Never consumed by the verdict**: pipeline has no coverage step (run-verification-pipeline.sh:70-94) and the hook does not call it. Only the regression-hunter agent uses it. | MIT-A | skip for now: runner-specific parsing, high false-signal, not deterministic across tools |
| Aggregate pipeline verdict | One PASS/FAIL JSON from all detectors plus tests | run-verification-pipeline.sh:70-84 steps, :96-120 verdict, :155-156 JSON | partly: `stubs --json` (stubs.mjs:468-510) and `check --format json` exist separately | One verdict object across checks. Weak: all-or-nothing, see Defect 3. | MIT-A | reimplement idea: `product-engineer verify` as one deterministic command (item 1) |

## D. Agents, commands, skills (LLM-driven; the part that is not deterministic)

| capability | what the user gets | how implemented | do we have it | where it beats ours | licence | adopt? |
|---|---|---|---|---|---|---|
| claim-validator agent | Each atomic claim in the completion report becomes Agree/Disagree/Unverifiable with a probe, rc and evidence; FAIL if any Disagree; PASS with all Unverifiable is rejected | agents/claim-validator.md:11-30 method; :34-52 output; :54 FAIL rule; :58-66 hard rules; tools Read/Grep/Glob/Bash only, write tools denied (:4-5) | partly: P/bin/claims.mjs:1-12 lists numbers, versions, names and says whether the repo contains them ("candidates, not verdicts"); P/bin/claim-gate.mjs:61-70 classifies 5+ claim families and demands specific evidence | Rival turns **every** sentence of the report into a probe; ours covers fixed families only. Ours is deterministic, cheaper, and cannot be flattered (rival's own list names "Sycophancy" :64 as its failure mode). | MIT-A | reimplement idea only for deterministic probes: extend `claims.mjs` with `function X added in file Y` -> grep. Skip the agent. |
| e2e-verifier agent / E2E probe | Must run a real command (curl, CLI, `python -c`) against the **new** behaviour; no probe and no "unverifiable" entry = FAIL; PASS needs non-empty `commands_run` | agents/e2e-verifier.md:21-28 method; :52-54 rules; verify.md:51 phase 4 "cheapest reproducible probe" or `not_applicable` :63 | partly: P/skills/done-means-observed/SKILL.md ("Watched: / Could not check:" report, never "done" with an empty Watched, line ~48-53) | Rival makes the probe a hard rule in a verdict structure with `commands_run`. Ours is a checklist the agent fills in itself. Neither runs anything deterministic: both rest on the agent describing what it did. | MIT-A | reimplement idea: claim-gate can require a non-test Bash event after the last write when the report says "Watched:" (item 6) |
| completeness-auditor, test-quality-auditor, regression-hunter, adversarial-reviewer | Four hostile read-only reviewers that run the detectors and then read the diff | agents/*.md frontmatter `disallowedTools: Write, Edit, MultiEdit, NotebookEdit` (each :5); completeness :19-27; test-quality :18-24; regression :18-26 | no | Independent second reading with write tools removed (the reviewer cannot "fix" its way to a pass). Needs paid model calls; results are not reproducible. | MIT-A | skip: not deterministic; our bench forbids model calls in the checker |
| final-judge | Combines the six reports: one FAIL = FAIL, a PASS with empty `commands_run` is invalid, missing auditor = FAIL | agents/final-judge.md:34-38 rules, :60-62 | no | The rule "PASS needs evidence" is the useful part; it is a few lines of logic, not an agent. | MIT-A | reimplement idea: if a report says PASS and lists no command run, treat as FAIL (item 5) |
| `/dod:verify` | 5-phase report: snapshot, stubs, tests, e2e probe, verdict, in a fixed greppable shape | commands/verify.md:14-43 format, :45-58 steps, :60-64 hard rules ("never claim PASS without phases 2 and 3") | no | A fixed report shape the next session can grep. | MIT-A | reimplement idea: output of `product-engineer verify` (item 1) |
| `/dod:audit` | Dispatches 6 auditors in parallel then final-judge; footer with session id | commands/audit.md:19-29, :40-44, :48-49 | no | See above. | MIT-A | skip |
| `/dod:confess` | Seven mandatory sections: gaps, weak tests, unhandled edge cases, hardcoded values, unwired files, TODOs left, refactors not done; saved to `.dod-guard/reports/confession-<ts>.md`; the validator then fact-checks it | commands/confess.md:17-50 template, :57-62 hard rules | partly: done-means-observed has "Could not check:"; customer-block has a "not shipped" heading (P/bin/headings.mjs:12 key `notShipped`) | Forces enumerating **unwired files** and **hardcoded values** before saying done. Ours asks only what could not be observed. The unwired-file section is mechanically checkable. | MIT-A | reimplement idea: deterministic "unwired new file" check (item 7); skip the prose ritual |
| `/dod:init`, `/dod:stubs`, `/dod:tests`, `/dod:report`, `/dod:checklist`, DOD.md templates | Setup, quick scan, test-quality scan, formatted report from disk, checklist from DOD.md (templates DOD.md.template, DOD-node/go) | commands/init.md:12-50 stack detect, monorepo prompt, template substitution; templates/ | partly: `product-engineer doctor`, `template` (check.mjs usage lines) | Per-project written definition of done that loads at SessionStart. | MIT-A | skip: packaging |
| Skills: dod-enforcement, adversarial-verification, stub-detection-patterns, evidence-reporting | Prose rules and a "command run block" format for evidence | skills/*/SKILL.md (71, 68, 126, 99 lines) | yes: P/skills/done-means-observed, product-engineer | Evidence-reporting asks for a command block with output per claim, same intent as our "Ran: <command>: <result>" line. | MIT-A | skip |
| Self-test suite | Fixtures with intentional stubs; tests for detectors, hooks, integration | tests/test-detectors.sh:76-78, tests/fixtures/* | yes (P/test/) | none | MIT-A | skip |

## E. Configuration switches (D/templates/dod-guard.json.template)

| switch | what it does | where | do we have it / is it real? | adopt? |
|---|---|---|---|---|
| `strictness` strict / normal / lenient | Template comment: strict = block on warns, normal = block on highs, lenient = warn-only (:5-6) | template :5-6; init.md:26 substitutes it | **Not implemented.** `grep strictness` over D/scripts and hooks finds only the config reader in session-start.sh:38 (prints it). The pipeline reads `severity` and drops it: run-verification-pipeline.sh:43 "Reserved for future severity-aware verdicts; deliberately read but unused". Any count above 0 fails (:108-110). So the three levels do nothing. | reimplement idea, actually wired: item 8 |
| `detectors.<name>.enabled / severity` | Per-detector on/off and block/warn | template :16-52 | enabled: yes (pipeline :42-48). severity: no (above) | reimplement with real effect |
| `hooks.post_edit.severity` | warn or block on edit | post-edit.sh:44-48, :72-87 | real | adopt as warn default |
| `hooks.pre_commit.require_stubs_clean / require_tests_pass / require_verify_recent / verify_ttl_seconds` | Commit gates | pre-commit.sh:47-57 | real, but see Defect 2 | adopt the names; fix the hook type |
| `hooks.stop_gate.skip_tests` | Keep Stop fast by skipping tests | stop-gate.sh:53-57 | real | adopt (we never run tests in the Stop hook) |
| `verification.run_tests / require_e2e_probe / coverage_floor / coverage_drop_tolerance` | Test run, probe, coverage | template :60-66 | `run_tests` real (pipeline :49); `require_e2e_probe`, `coverage_floor`, `coverage_drop_tolerance` appear only in the template; no script reads them (grep over D/scripts, D/hooks) | skip |
| `scope.roots`, `exemptions.paths` | Monorepo scope, path exclusions | template :11-14, :99-109; lib/exemptions.py | real | adopt exemptions (B table) |
| `audit.parallel / subagents` | Audit dispatch list | template :86-97 | real, prose-level | skip |
| `reporting.dir / keep_sessions` | Report folder and retention | template :68-72 | `dir` used by hooks; `keep_sessions` never read (no pruning code in D/) | skip |

## F. Defects in the rival that change what we should copy (all verified by reading)

1. **Test failures never fail the pipeline.** run-full-suite.sh:65-66 is `raw="$("${cmd[@]}" 2>&1 || true)"; rc=$?`. `|| true`
   makes the substitution succeed, so `rc` is 0. `bash -c 'raw="$(false || true)"; rc=$?; echo rc=$rc'` prints `rc=0`. The JSON
   then carries `"exit_code":0` (:104). run-verification-pipeline.sh:92 reads that field, so `TESTS_RC` is 0 and `tests_failed`
   (:113-115) is never added. In `--quiet` mode, which hooks and the pipeline both use (stop-gate.sh:59, pre-commit.sh:88,
   pipeline :90), a red suite counts as green. The only guard is the `failed` count parsed from text, which the verdict ignores.
   Its tests (tests/test-detectors.sh) exercise the detectors only; no test greps `tests_failed`.
2. **The commit gate runs after the commit.** hooks.json:26-35 puts pre-commit.sh under **PostToolUse**; pre-commit.sh:3-4 says so.
   A PostToolUse block cannot stop a Bash command that already ran. `git commit` has finished when the gate speaks.
   The `--no-verify` ban (:36-43) has the same limit. Ours is PreToolUse (P/hooks/hooks.json:16-26), which can deny first.
3. **Whole-project scan makes the gate all-or-nothing.** The pipeline runs `detect-stubs.sh --all` (:71) and the Python
   detectors on `.` (:74-80), so a TODO from last year fails today's change. This is why the rival's own config exempts 21 paths
   (D/.dod-guard.json:65-87).
4. **Marker is forgeable and unbound.** The marker holds only a timestamp (stop-gate.sh:67); it names neither the commit, the tree
   nor the command. An edit after verify inside the TTL still passes.
5. **`had_mutation` is 1 whenever the transcript path is missing** (stop-gate.sh:39-46), so a read-only question gets gated.
6. **jq-less fallback** parses JSON with grep/sed (post-edit.sh:33-36, pre-commit.sh:25-27) and silently turns off the TTL, test
   and severity switches (they all sit inside `if command -v jq`). Node would not have this gap.

## G. Ranked: the 8 capabilities most worth adopting, and what a deterministic reimplementation needs

1. **`product-engineer verify` (one deterministic verdict).** Runs `stubs` over the working-tree change, a detected test command,
   and prints one fixed-shape report (snapshot, stubs, tests, verdict) plus `--json`. Needs: reuse `scanChange` (P/bin/stubs.mjs:435);
   run the test command with `spawnSync` and take `status` directly (not through `|| true`); parse counts per runner from stdout;
   exit non-zero on `status != 0` regardless of parsed counts. Source for the report shape: D/commands/verify.md:14-43 (idea only).
2. **Suspicious-return detector (stub with real-looking code).** A function named with an action verb whose every return is
   `None/null/{}/[]/""/0/false`. Needs, for Node without Python: a brace and indent body extractor (P/bin/stubs.mjs:223-280 `jsBody`,
   `pyBody` already exist), the verb list (D/scripts/detect-suspicious-returns.py:44-53), a rule that the verb is the **first**
   token of the name (not `any`, which the rival uses at :60 and which over-flags), restricted to added functions, warn level,
   and a fixture of false positives (`getEmpty`, `isEmpty`, `clear`).
3. **Test-run result parsing.** Counts and exit code from pytest, jest/vitest, `go test`, `cargo test`, `npm test`. Needs a table of
   (marker file -> command -> regex), `spawnSync` with `status`, a timeout, and a fixture per runner proving a failing suite gives a
   non-zero verdict. Test it against the Defect 1 case first: a failing command must produce `failed` verdict.
4. **Verify marker bound to the tree.** `.product-engineer/verify.json` holding `{tree: git write-tree, command, status, time}`,
   written only by the `verify` command (item 1), valid while the tree hash is unchanged and age is under a TTL (default 600 s,
   config key). Needs `git write-tree` on a temporary index (or `git stash create` hash) so unstaged edits count, and
   a reader in `commit-guard` that denies when absent, stale or failed. This fixes Defect 4.
5. **PASS needs evidence.** Rule from D/agents/final-judge.md:29,37: a report that says passed with no recorded command is FAIL. Needs
   claim-gate to treat "verified/passes" claims as unmet unless the verify file (item 4) or a Bash test event exists for
   the current tree. Mostly extends P/bin/claim-gate.mjs:143-150 (`passing` family).
6. **Auto-run stubs on edit (PostToolUse) and at Stop.** Needs a `bin/post-edit.mjs` reading `tool_input.file_path`, running
   `scanAdded` over that file's lines changed since HEAD, printing `systemMessage` (warn default); optional config key to block.
   Add `PostToolUse` to P/hooks/hooks.json. Exemption list from `.product-engineer.json` (D/scripts/lib/exemptions.py:81-102 for
   the glob shapes). Make claim-gate refuse "done" while this turn's writes still carry findings.
7. **Unwired new file check (from `/dod:confess` section 5).** For each file added in the range, search the other tracked
   files for its basename or import path (the lookup `P/bin/twins.mjs:26` already has `SKIP_SEARCH`); list files nothing references.
   Needs an allowlist (tests, docs, configs, entry points from package.json `bin`/`main`/`exports`) so it reports candidates, not verdicts.
8. **Real strictness levels.** Three levels with actual effect: lenient = print all, exit 0; normal = exit 1 on error-class
   findings only; strict = exit 1 on warn too. Needs each finding to carry `level` (the check JSON already does: P/bin/json-report.mjs:1-8),
   the level read from `.product-engineer.json`, and a test per level that a warn finding changes the exit code only under strict.
   Counter-example to avoid: D/scripts/run-verification-pipeline.sh:43,108 where the setting exists but changes nothing.
   Also add the `--no-verify` deny in `commit-guard` (D/hooks/handlers/pre-commit.sh:36-43) here as a 3-line rule.

Not worth adopting: the seven subagents, final-judge, SubagentStop recorder, SessionStart injector, coverage delta, init/report/
checklist commands, DOD templates. They need model calls or add packaging, and the rival never feeds coverage into a verdict.
