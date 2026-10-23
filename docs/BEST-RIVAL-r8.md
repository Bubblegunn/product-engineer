# Best-rival analysis, round r8 (BEST-RIVAL-SPEC steps 1 to 5; research and implementation only, no measurement)

Written 2026-10-23 on `plugin-leadership`, before any r8 code change. Nothing here changes criteria, checks, tasks or the win rule.
No benchmark, development gate or held-out run was made in r8 (owner instruction: credit is low).

## 0. Protocol note: SDK path versus the old CLI path

Every `claude -p` call of this project now goes through `~/claude-kredi-runs/sdk-shim/claude`, which calls the installed CLI 2.1.308 via
`claude_agent_sdk.query()`. Known differences from the old CLI path: the desktop app's `Artifact` tool and the `artifact-diagramming` skill
are absent on the SDK path; old CLI cells also saw the machine's user-level skills (for example caveman, impeccable; proactive-gate round 5
diagnosed 44 against 18 skills). Cost and behaviour figures from the CLI period therefore do not compare one to one with SDK figures.
In the tables below, rival cells that come from rounds 3 and 4 (public set) are CLI-path cells, marked "(CLI)". Rounds 6 and 7 are SDK path.
In the final gate no cell is reused. Billing check of this round: one Haiku call through the shim, `apiKeySource` = `ANTHROPIC_API_KEY`,
Claude Code 2.1.308, 0.0039 USD.

## 1. Loss analysis

Sources read this round: `docs/HEAD-TO-HEAD.md` lines 854-888 and 1040-1288, `results/round7/SUMMARY.md` context via the r7 report,
the r6 and r7 reports, and the harness code `bench/head-to-head/grade.mjs` and `objective.mjs`. A cell-by-cell side-by-side of raw answers
(a planned sub-agent task) did not finish before the session was cut; the per-criterion classes below rest on the grader reasons quoted in
those reports and on the code, not on a fresh reading of every answer. Cells where that matters are marked "from report".

Last valid measurements: round 6 held-out set (SDK, 11 arms x 3): ours 19.67 of 20, eight arms 20.00. Round 7 development gate (ours x3 only,
seen sets): failed after three iterations. Public 13 tasks: last full measurement is round 3/4 (CLI path).

| Cell | Criterion (short) | Ours vs best other | Class | Evidence |
|---|---|---|---|---|
| r6 X3 run 1, c1 | notes name the `--json` flag | 3.67 vs 4.00 | PRODUCT GAP (fixed in `86c90cc`) | our own `notes` checker counted `--json` as unreadable code; r7 report section 1; plain Claude wrote the flag |
| r6 X5 run 1 | answer language | tie at 4.00 | PRODUCT GAP (rule added) | answer in another language than the request; from report, not re-read |
| r7 set c X1 c1 | new commit exists | 3.00 vs 4.00, 9 of 9 runs | HARNESS (grader material) | `grade.mjs:189`: `NEW COMMITS (none)`; `grade.mjs:176-177` shows commits only `if (ctx.state)`; `objective.mjs:40-45` returns null when `.git/fixture-state` is missing; `run.sh:246-250` builds external (held-out) fixtures with the task's own `fixture.sh`, which never writes that file (only `mk.sh:464` does) |
| r7 set b X3 c1-c4, iter 3 | rewritten file content | 1.00 vs 2.00 | HARNESS plus variance | `grade.mjs:184-186` shows a commit as `diff stat` only (full patch only for variant `h5`); a committed rewrite shows no text. Runs 1 and 2 scored 0, run 3 scored 3 of 4 |
| r7 set b X2 c4 | commit exists | 1.33 to 2.00 | HARNESS | same missing `fixture-state` |
| r7 set b X2 c3 | subject for a non-technical reader | 2.00 vs 1.33 | PRODUCT GAP (rule `00109d7`, unmeasured) | from report |
| r7 set b X3 c4 | numbers compared with code before saving | 2.67 vs 2.00 | PRODUCT GAP (rule `00109d7`, unmeasured) | from report |
| r7 set c X5 c2 | old and new value of a changed limit | 3.67 vs 4.00 (iteration 2) | PRODUCT GAP (rule `00109d7`, unmeasured) | from report |
| r7 set c X4 c4 | read the README before advising | 3.33 vs 4.00 (iteration 1) | PRODUCT GAP, fixed in `c8541b3` (4.00 in iterations 2 and 3) | from report |
| r6 X1, X2, X4, X5 | all | tie at ceiling 4.00 | TASK SHAPE (saturated: 11 arms at 19.00 or more) | r6 report section 3-4 |
| public T3, H2, H4, H6 (r4 interim, CLI for rivals) | over-vouching, test-first, refactor shape, plain rewrite | ties and small gaps | PRODUCT GAP (rules in `71043a2`, `6a2a319`) plus noise | grader reasons in HEAD-TO-HEAD.md 877-883; our answers not on disk |

Counts (one row per loss class, rows above): product gap 7 rows (all 7 have a rule written; only X3 c1 and X4 c4 were re-measured at 4.00, on seen sets), harness 3 rows,
task shape 1 row. Reading: the seen-set failures that remain in the development gate (set c X1, set b X2 c4, set b X3) are mostly the harness
showing the grader no evidence of a commit. The grader material gap is the largest single fixable item and it affects every arm on external
tasks equally, so it hides real differences instead of creating them.

Additional harness finding: for external (held-out) variants the grader also never sees the working-tree diff (`grade.mjs:216-225`: only
variants h1-h4), so an answer that edits a file without committing shows nothing to check against.

Runner version finding (r7 iteration 3): failed cells ran `claude` 2.1.2 because `run.sh:38` takes `PE_BENCH_CLAUDE:-claude` from PATH and the
shim directory was not first. `run.sh:275` records the version but nothing refuses a wrong one.

## 2. Rival tactics, read deeper (pinned clones in `/tmp/r8-rivals`, read only, nothing executed)

Full file:line notes: `/tmp/r8-notes/{ce-sp,dod-gt,gwc-iso}.md` (sub-agent output, kept outside the repo; the table below carries what is used).
Licences checked from the clones: dod-guard MIT, groundtruth MIT, iso-24495 MIT, compound-engineering MIT, superpowers MIT,
git-weekly-changelog: no LICENSE file (idea only). Plain Claude has no files: its behaviour is the baseline arm.

What each rival does where we are measured:

- **compound-engineering** (`738067a`): `ce-commit-push-pr` writes a scope map from the full oneline list plus the three-dot diff before composing
  (`pr-description-writing.md:66-68`), sizes the text by decision cost, uses `git commit -F file -- <paths>` and never `git add -A`
  (`ce-commit:46-58`), never invents `Fixes #N` (`pr-desc:119-134`). It has no "not traced" wording; nearest is "State the claims the diff alone
  cannot establish; leave the rest implicit" (`pr-desc:70`). No enforcement. We already hold the stronger rule (SKILL.md rule 2 and 3, `scope`).
- **superpowers** (`2ce8aa1`): `verification-before-completion` is a prompt gate (identify command, run fresh, read output and exit code, then
  claim; banned hedges, `SKILL.md:52-71`). No hook reads the final answer. Our Stop hook `bin/claim-gate.mjs` is the missing enforcement.
- **dod-guard** (`be038f7`): Stop hook blocks on repository state (`stop-gate.sh:77-91`), `stop_hook_active` guard (`:30-32`); the block reason
  never asks for the full answer again, so the next message can replace the deliverable. All hooks exit 0 without `.dod-guard.json`.
  Stub and tautology detectors are file-level, not added-lines (gap noted in the sub-agent map).
- **groundtruth** (`c3aa4a7`): Stop hook, regex claim extraction (`claims/extract.ts:14-36`) without negation or code-span handling, status
  `verified | failed | warning | unchecked` (`types.ts:18`) and the rule "verified nothing must not look like verified clean" (CHANGELOG 0.3.0).
  Same overwrite gap at Stop (`hook.ts:122-124`). Re-runs the test suite inside the hook (4-minute budget).
- **iso-24495** (`5951eb7`): strongest fidelity wording of all rivals: "Every 'after' keeps the facts of its 'before'. It adds none and drops no
  qualification" (output style line 50), "Never supply the missing wording yourself" (`iso-24495-5:52`), a marked `[Author needed]` slot instead
  of invented text, "promote a sentence only if it stays true away from its paragraph" (`:51`). Deterministic engine in TypeScript (sentence
  limits with two readings of ambiguous full stops, `parse.ts:1337-1358`; average counts only from 10 sentences, `audit-corpus.ts:47`); PR-text
  gate exits 3 when the audit did not read the target (`description-report.ts:28-58`).
- **git-weekly-changelog** (`f0164c0`): groups bullets by what a user can do; rule 10 "traceable to a commit, diff or changed file"
  (`SKILL.md:99`); one line "if tests or builds were not run, say so" (`:102`). No number, old-and-new or untraced-claim rule.
- **Plain Claude**: wins most cells by writing the obvious thing without extra rules. Where it beats us the cause was our own rule or checker
  (hook replacing the answer, `notes` rejecting `--json`), never a technique it has.

### Technique map (general ones only; fixture-specific ideas rejected)

| Technique | Source (licence) | Ours today | Decision |
|---|---|---|---|
| Complete-answer restatement after a block | none has it | `claim-gate.mjs:158` | keep (we lead) |
| Claim extraction ignoring quotes, code, negation | none has it | `claim-gate.mjs:26,40-66` | keep |
| "Added tests" claim needs a test-file write in the turn | groundtruth (MIT) idea | no | ADOPT (r8-1) |
| Skip and stub markers beyond py/js: `.only(`, xfail, `t.Skip(`, `#[ignore]`, `@Disabled`, Go `panic("not implemented`, Rust `todo!(`, `expect.assertions(0)` | dod-guard, groundtruth (MIT) ideas | `stubs.mjs:63-96` py/js only | ADOPT (r8-2), re-written, no code copied |
| Test-run result text parsing, infrastructure failure reads "not checked" | groundtruth | no (`tool_result` not read; block shape not verified) | NOT DONE (needs a real transcript sample; listed for next round) |
| Two-reading sentence split, abbreviations do not make sentences | iso-24495 (MIT) idea | `facts.mjs:159-172` splits on every stop | ADOPT (r8-3), own abbreviation list |
| Deterministic claim readback: every number and backticked name in the answer is looked up in repo files and git output | LOSS-ANALYSIS tactic 3, Self-Refine idea | `facts` covers rewrites only | ADOPT (r8-4, new `claims` command) |
| Checker says candidates, not verdicts | SWE-agent idea (arXiv 2405.15793) | partial | ADOPT in r8-4 output |
| Scope map before composing from the whole range, not the last commit | compound-engineering (MIT) | `scope` command exists; skill does not say "write it first" | ADOPT (r8-5, one sentence) |
| Name files in `git add`/`git commit -- paths`; never `git add -A`; never force-push; never invent `Fixes #N` | compound-engineering, superpowers (MIT) | no | ADOPT (r8-5) |
| Lifted text stays true alone; marked gap instead of invented wording | iso-24495 (MIT) | no | ADOPT (r8-5) |
| "No test suite configured: say so" in refactor line 3 | compound-engineering | no | ADOPT (r8-5) |
| Rationalization tables, SessionStart injection, "1% chance must invoke", babysit, stack mode, emoji labels, section counts, word catalogs | superpowers, ce, gwc, iso | no | REJECT (length, false activation, no honesty gain) |
| Re-run tests inside a hook; edit-time scans of whole files; multi-agent LLM audits | groundtruth, dod-guard | no | REJECT (cost, accusation of pre-existing issues) |
| Hedge-word detector (should, probably) | superpowers | no | REJECT (low precision; claim families are narrower) |

Second-best arm check: iso and gwc were re-read; neither carries a number, old-and-new or untraced-diff rule, so adopting the items above does not
open a gap to them.

## 3. Open-source and technology scan (WebFetch, 2026-10-23; GitHub API fields read from the response)

| Item | What | Licence | Use |
|---|---|---|---|
| googleapis/release-please | release PRs from Conventional Commits; 7,658 stars; pushed 2026-10-22 | Apache-2.0 | idea: derive the "what changed" list from commit types, not from the model |
| orhun/git-cliff | changelog from git history by commit parsers and templates; 12,330 stars; pushed 2026-09-18 | Apache-2.0 | idea only; the page does not say it checks messages against diffs |
| conventional-changelog | changelog and release notes from commit metadata; 8,522 stars; pushed 2026-10-22 | ISC | idea only (same limit) |
| arXiv 2601.04886 (Gong, Pinna, Bian, Zhang; v2 2026-01-26) | 23,247 agent PRs, 974 hand-labelled; 406 (1.7%) high message-code inconsistency; most common type "descriptions claim unimplemented changes" 45.4%; acceptance 28.3% against 80.0%; merge time 55.8 h against 16.0 h | paper, abstract page read | motivates the `addedtests` claim family and `claims` readback; abstract does not state a tool or dataset release |
| arXiv 2610.17724 "Evidence-First Agentic Verification" (Sanayei et al., 2026-10-13) | Sauron: check each claim independently against its source, attach an evidence receipt to each verdict; 97% of injected faults detected, 2% of clean controls flagged (abstract) | CC BY 4.0 (paper); no code link found | idea: `claims` output lists each claim with where it was found (the receipt) |
| ISO 24495-1:2023 plain language | iso.org page returned HTTP 403; the standard is not read directly; the iso-24495 plugin (MIT) is the only form read | n/a | nothing taken from the standard text itself |
| Hugging Face NLI models (search `nli`, sorted by downloads): `MoritzLaurer/mDeBERTa-v3-base-xnli-multilingual-nli-2mil7` (MIT), `cross-encoder/nli-deberta-v3-small` (Apache-2.0) | out-of-source-content detection by entailment | MIT / Apache-2.0 | idea only: a dependency-free CLI cannot ship a model; recorded for a future optional judge |
| arXiv 2603.01896, 2609.31422 | search-result summaries only (agentic code reasoning; provenance gate that blocks unsupported claims); not opened | unknown | not used |

Not done: Hugging Face datasets search, npm and PyPI searches, GitHub repository search for other claim-checkers (the budget cut the scan). Listed in the report.
