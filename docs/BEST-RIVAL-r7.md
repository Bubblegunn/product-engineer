# Best-rival analysis, round 7 (steps 1 to 5 of BEST-RIVAL-SPEC.md)

Written 2026-10-23 on branch `plugin-leadership`. Not committed. Nothing in this file changes criteria, checks, tasks or the win rule.
Step 6 (development gate) is not part of this document.

Method: score tables and grader reasons were read from `docs/HEAD-TO-HEAD.md` lines 854-888, 1040-1137 and from
`bench/head-to-head/results/round6/` (`SUMMARY.md`, `tasks/tasks.json`, `runs/X3/*/1/answer.md`, `runs/X5/ours/1/{answer.md,trace.jsonl}`)
and `bench/head-to-head/results/round-3/` (`SUMMARY.md`, `runs/T3-*/PR.md`). Rivals were cloned with `git clone --depth 1` and
`git checkout --detach <commit>` into `/tmp/r7-rivals/<name>/repo` and were only read, never run. Task numbers X1-X5 exist twice:
the deep round (an earlier held-out set) and round 6 (set Y). They are different tasks and are kept apart below.

## What I did not read or could not check

- Ours answers for the round 4 cells (T3, H2, H4, H6, H1) are not on disk (`<RUNS>/2026-10-22/h2h-r4` holds only
  sandbox and plugin copies; I looked at its listing). For round 4 I rely on the grader reasons quoted in HEAD-TO-HEAD.md lines 877-883.
  The rival cells of the public set are round 3 values reused (HEAD-TO-HEAD.md line 862), except H1 (all arms round 4).
- The public tasks that are not in the round 4 interim table (H3, H5, H7, T1, T2, T4) were not re-examined. In the round 3 table
  `ours` has the highest outcome mean on H3, H5, H7, T1 and T4 (rows read at `round-3/SUMMARY.md` lines 7-12 and 20-30); T2 appears in
  two tables there with different values (4.00 and 5.00 for ours) and I did not resolve which one counts.
- Per-vote grader reasons for round 6 are in `grades/vote-*`; I read only the one criterion sentence quoted in `SUMMARY.md`.
- Rival files I did not read: dod-guard `agents/*` except `claim-validator.md`, `scripts/*` internals, `commands/*` except `verify.md`
  and `confess.md`, `docs/*`, `skills/evidence-reporting`, `skills/stub-detection-patterns`; gwc `README.md`, `plugin.json`;
  iso-24495 skills 4, 5, code, text-audit, `output-styles/iso-24495.md` beyond its headings and lines 1-50, `iso-24495-3` after line 60,
  `scripts/*.ts`; superpowers every skill except `verification-before-completion` and the head of `using-superpowers`, and the
  session-start hook after line 60.
- I did not check whether the benchmark task repositories contain a `.dod-guard.json`. The dod-invoked X3 trace mentions the file
  name 3 times; I did not read those places.
- I did not trace how our X3 session learned that `product-engineer notes` exists (`arms.json` shows the harness probes
  `--help notes`; `SKILL.md` does not mention `notes` by name, checked with grep).

## 1. Best rival, task by task

Scores are mean outcome points (public set out of 5, held-out out of 4). "Gap" = best rival minus ours; positive means we are behind.
Rival forms: natural (plugin installed, not named in the prompt) and `-invoked` (prompt prefix from `results/round6/arms.json`).

### Public set, round 4 interim (HEAD-TO-HEAD.md 854-888; rival cells from round 3 unless noted)

| Task | ours (r4) | best rival (score) | gap | other rivals at or above ours |
|---|---|---|---|---|
| T3 | 4.00 | base, gwc-invoked 4.67 | +0.67 | dod 4.33, iso-invoked 4.33 |
| H2 | 4.33 | dod, dod-invoked, iso-invoked 5.00 | +0.67 | iso 4.33 (tie) |
| H4 | 4.33 | dod, dod-invoked, gwc-invoked, iso 4.33 | 0.00 (tie) | none above |
| H6 | 4.33 | base, dod, dod-invoked 4.67 | +0.33 | gwc 4.33 and gwc-invoked 4.33 (tie) |
| H1 (lockout, all arms r4) | 4.00 | gwc, gwc-invoked 4.67 | +0.67 | dod 4.33, iso 4.33; base 4.00 (tie) |

### Held-out set Y, round 6 (`results/round6/SUMMARY.md`, 11 arms x 3 runs, outcome mean out of 4)

| Task | ours | best rival | gap | note |
|---|---|---|---|---|
| X1 | 4.00 | 8 other arms 4.00 | 0 | tie at ceiling (ce 3.00) |
| X2 | 4.00 | 9 other arms 4.00 | 0 | tie at ceiling (sp 3.67) |
| X3 | 3.67 [3/4/4] | all 10 other arms 4.00 | +0.33 | the only lost point: run 1 criterion 1 |
| X4 | 4.00 | all 10 other arms 4.00 | 0 | tie at ceiling |
| X5 | 4.00 | all 10 other arms 4.00 | 0 | tie at ceiling; run 1 answered in the wrong language |

Under rule B a tie counts as a failure unless both are at the maximum. All five round 6 tasks are at the maximum except our X3.

### Deep round held-out set (HEAD-TO-HEAD.md 1040-1074; arms ours, base, ce, sp-invoked only)

| Task | ours | best rival | gap |
|---|---|---|---|
| X1 | 4.00 | base, ce, sp-invoked 4.00 | 0 (saturated) |
| X2 | 2.00 | base 1.33, ce 1.33 | -0.67 (we lead) |
| X3 | 0.67 [2/0/0] | base, ce, sp-invoked 2.00 | +1.33 |
| X4 | ungraded | not run | not computed |

### Who is ahead of or level with ours most often

Counted per underlying arm (best of natural and invoked form), over the 5 public interim tasks and the 5 round 6 tasks (10 cells).
Method: a cell counts when the arm's mean is at or above ours on that task, using the tables above.

| Arm | public (of 5) | round 6 (of 5) | total (of 10) | cells it is behind ours |
|---|---|---|---|---|
| dod | 5 (T3, H2, H4, H6, H1) | 5 | 10 | none |
| gwc | 4 (T3, H4, H6, H1) | 5 | 9 | H2 |
| iso | 4 (T3, H2, H4, H1) | 5 | 9 | H6 |
| base (no plugin) | 3 (T3, H6, H1) | 5 | 8 | H2, H4 |

Primary rival by count: **dod-guard** (10 of 10). **git-weekly-changelog** and **iso-24495** are tied at 9 of 10. The brief named gwc as a
co-primary and iso as second; by this count iso equals gwc, so both are read below (gwc in section 2, iso in section 5). Round 6 is
saturated (every arm at or near 4.00), so most of these counts show ceiling ties, not rival technique. The deep round did not run
dod, gwc or iso, so it adds nothing to their counts.

Two facts limit what "primary rival" means here:

1. In natural form every dod-guard hook ends with `exit 0` unless `.dod-guard.json` exists (section 2), so natural dod is close to the
   bare model on a repository without that file. I did not check whether the task repositories have it (see above).
2. gwc is a weekly-changelog skill. On H1 (a login feature) gwc and gwc-invoked both scored 4.67 and ours 4.00; nothing in the gwc
   skill text (102 lines) concerns login, lockout or tests, so that lead does not come from its text and may be run-to-run variance (3 runs).

## 2. Primary rivals read end to end

### 2a. dod-guard (commit be038f7, MIT)

Loaded in natural form (`hooks/hooks.json`): five hooks, plus skills/commands/agents that load on demand.

Ordered steps the plugin tells the agent (skill `skills/dod-enforcement/SKILL.md`):

1. Before code: read `DOD.md`, read `.dod-guard.json`, run `/dod:checklist`, plan against the criteria (SKILL.md:12-15).
2. During work: after each edit a PostToolUse hook scans the file; fix a warning at once (SKILL.md:19); run `/dod:stubs` every 5-10
   minutes (SKILL.md:20); ask of each test whether it would pass if the code were replaced by `return null` (SKILL.md:21).
3. Before "done": emit the Task Completion Report with sections Summary, Files modified (path:lines), Claims I am making (each with
   Evidence), Verification I ran (verify/audit verdict, manual probe with observed result), Known limitations (honest), Next session
   (SKILL.md:27-54); refuse to omit a section, even as "(none)" (SKILL.md:56).
4. `/dod:verify` is a 5-phase report: Snapshot (branch, HEAD, dirty yes/no, changed files), Stubs, Tests, E2E probe, Verdict
   (`commands/verify.md:14-43`, steps at lines 47-58).
5. On commit: a PostToolUse hook on Bash blocks `git commit` when stubs are staged, `/dod:verify` has not passed in 600 seconds, or the
   suite fails (`hooks/handlers/pre-commit.sh:61-96, 102-111`); `--no-verify` is blocked (`pre-commit.sh:36-43`).
6. At Stop: `hooks/handlers/stop-gate.sh` runs the verification pipeline and, if it fails, blocks with 4 numbered next steps ending
   "attempt to end your turn again" (`stop-gate.sh:77-91`).

Correction to our own earlier text: HEAD-TO-HEAD.md line 1085 says dod-guard "never blocks at Stop". `stop-gate.sh:59-91` does
block at Stop when the pipeline fails. It only does so when `.dod-guard.json` exists (`stop-gate.sh:21-23`), and not when
`stop_hook_active` is true (`stop-gate.sh:30-32`). Our sentence is true for the benchmark only if those repositories lack the file.

Rules and checks, numbered:

1. Read the Definition of Done file first (`dod-enforcement/SKILL.md:12`). 2. Scan every edited file for stubs
(`post-edit.sh:5-9`). 3. A test must fail against a stubbed implementation (`SKILL.md:21`). 4. Never add `test.skip`/`xit` to make a
suite green (`SKILL.md:62`). 5. Never leave TODO/FIXME in a file reported done (`SKILL.md:63`). 6. Never claim PASS without running
the stubs and tests phases (`verify.md:62`). 7. Never skip the e2e probe silently: run something or label it `not_applicable` with a
reason (`verify.md:63`). 8. Never invent a verification step (`SKILL.md:64`). 9. Every claim needs a probe with a result; claims
without one are "Unverifiable" (`agents/claim-validator.md:22-30, 58`). 10. A validator PASS with empty `commands_run` becomes FAIL
(`skills/adversarial-verification/SKILL.md:18`). 11. Read the diff, do not trust the detector alone
(`adversarial-verification/SKILL.md:45-53`). 12. `/dod:confess` writes a 7-section self-audit to disk, "nothing to confess" allowed
but the heading must appear (`commands/confess.md:15-62`).

On input it does not recognise:

- No `.dod-guard.json`: every hook exits 0 silently (`session-start.sh:21-23`, `post-edit.sh:24-26`, `pre-commit.sh:16-18`,
  `stop-gate.sh:21-23`); `/dod:verify` step 1 says "bail with a clear message" (`verify.md:47`).
- Edited file extension not a source type: hook exits 0 (`post-edit.sh:7`).
- A command that is not `git commit`: exit 0 (`pre-commit.sh:31-34`).
- No reproducible probe: the report says `not_applicable` and why (`verify.md:51`).
- A claim that repository inspection cannot decide: `Unverifiable`, routed to another auditor (`claim-validator.md:30`).
- No transcript or no mutation in the session: Stop gate skips (`stop-gate.sh:34-49`).

Natural versus invoked:

- Natural: the skill description gates on the config file (`dod-enforcement/SKILL.md:3`), and all hooks no-op without it, so the
  agent receives no dod instructions unless the file exists. This is a read of the code; I did not verify it in a trace.
- Invoked prefix: "Use the dod-guard plugin: run its /dod:verify command and follow its report format before you give your final
  answer" (`arms.json`). The X3 dod-invoked final answer is the verify box (`runs/X3/dod-invoked/1/answer.md` lines 1-14) with
  a Snapshot showing branch, HEAD, "dirty: no (before RELEASE_NOTES.md was written)".
- Score effect: round 6 gives no difference (all 20.00). Public H2: natural dod and dod-invoked both 5.00 against base 4.00, which the
  skill text cannot explain for natural form; with 3 runs I cannot separate technique from variance. Per-session cost in round 6:
  dod 0.0812, dod-invoked 0.0904, ours 0.0737, base 0.0587 USD (`SUMMARY.md`, mean of 15).

### 2b. git-weekly-changelog (commit f0164c0, no LICENSE file: idea only)

One file, `skills/git-weekly-changelog/SKILL.md`, 102 lines.

Ordered steps (SKILL.md:12-39): 1. Set the time window, default 7 days, state exact start and end with timezone (12-15).
2. Read `CLAUDE.md`; use read-only git and file inspection only, no builds or tests (17-19). 3. Inspect history with `git status
--short --branch`, `git log --since`, `--first-parent`, `git diff --shortstat`, `--dirstat` (21-29). 4. Group by theme, merge
related `feat`/`fix`/`refactor`/`docs`/`test` commits, 4-8 sections, skip a label with nothing under it (31-34). 5. Output in
chat, or to `docs/changelog-YYYY-MM-DD.md` with the Write tool when asked (36-39).

Rules, numbered: 1. Window stated with timezone (15). 2. Read-only inspection (19). 3. Group by user-visible capability, not by
commit (8, 31). 4. 4-8 sections (34). 5. Use only labels the commits support (95). 6. "Respond in the user's language" (78).
7. Each bullet traceable to a commit, diff or changed file (99). 8. Describe what changed and why it matters to a reader
unfamiliar with the commits (100). 9. No hashes in bullets (101). 10. "If tests or builds were not run, say so explicitly" (102).

Unrecognised input: no explicit handling. A range other than 7 days is honoured (14); a missing label is skipped (34, 95); nothing
covers a repository without commits in the window or without git.

Natural versus invoked: the description (line 3) triggers on "weekly update notes, recent branch changes, release-style summaries".
X3 (release notes) is close to that; I did not check whether gwc loaded in the X3 natural run. Invoked prefix is "Use the
git-weekly-changelog skill." Round 6: gwc 4.00 on every task in both forms, same as base. The X3 gwc answer names `minLength`,
`--min-length 1` and the file `src/count.js` in plain backticks (`runs/X3/gwc/1/answer.md`), so the skill does not forbid
identifiers; it also does not ask for them.

## 3. Side by side on the cells we lose or tie

### 3a. Round 6 X3 run 1, criterion 1 (ours lost it by all three votes)

Criterion text: "RELEASE_NOTES.md exists in the repo root and lists the new `--json` output flag as a new feature."
Task prompt: "Write RELEASE_NOTES.md for users, short, what's new / fixed / changed. Don't tag or push, I'll do that."
Grader reason (SUMMARY.md): "The notes describe JSON output but never name the --json flag".

| | ours run 1 (`runs/X3/ours/1/answer.md`) | base run 1 (`runs/X3/base/1/answer.md`) |
|---|---|---|
| New feature | "**New:** you can get the word count as JSON, for example `{"words":4}`." | "**New:** the `--json` flag. `--csv` was added and then reverted ..." |
| Why | "**Flag name:** the checker doesn't allow code identifiers, so the notes don't name the `--json` flag. Users will have to find it in the help text or docs." | no checker involved; names the flag, then `--min-length` for the changed default |
| Result | criterion 1 failed (3 of 4) | passed (4 of 4) |

Other rivals at 4 of 4 on X3 also name flags: gwc answer line "`--csv` is not mentioned ... The only new feature is `--json`."
(`runs/X3/gwc/1/answer.md`); gwc names `--min-length 1` for users.

Cause (controller finding, confirmed in code): `bin/notes.mjs:107` reports every item `identifiersIn()` finds as an error
("code a reader cannot follow"). `identifiersIn` takes every backticked token (`bin/notes.mjs:58-62`, `for (const m of line.matchAll(BACKTICK)) add(m[0])`),
so a user-facing option name such as `--json` is an error. Ours obeyed the checker and said so in the final answer. The checker's own
header says the opposite of a verdict: "A pattern can flag a word that only looks like code ... the exit code is for a person to read,
not a verdict" (`bin/notes.mjs:6-8`). The skill text does not tell the agent that.
Rival rule that produces the passing behaviour: none in gwc or dod forbids it; iso says code, commands and direct quotes are exempt
from its constraints and that technical accuracy wins over plain language (`iso-24495-1/SKILL.md:30-34`, `iso-24495-3/SKILL.md:18-19`).
Why ours did not: a pattern checker with no exemption for a name the reader must type, and a skill that does not say a failed
checker line can be overruled when the reader needs the item.

### 3b. Round 6 X5 run 1, answer language

Task prompt (English): "Support keeps asking me what the latest commit on main means for customers. ... Write SUPPORT_NOTE.md ... plain language for the support team ... no more than 6 sentences."
Ours trace (`runs/X5/ours/1/trace.jsonl`): the first final text is Turkish ("Ekledim: `SUPPORT_NOTE.md` repo kökünde, 6 cümle. Koda
dokunmadım.", row 4); after the claim-check block (row 5) the second and last text is German ("Ich habe `SUPPORT_NOTE.md` im Repo-Root geschrieben.", row 12, also `answer.md`).
Base run 1 answer is English ("`SUPPORT_NOTE.md` is written in the repo root. ..."). Ours still scored 4 of 4, so the language did not cost a point;
it is a defect the graders' criteria do not measure. `SKILL.md:69` already says "Answer in the language of the request", inside a paragraph
about done-checks. `SUMMARY.md` states the machine's user-level settings load for all arms and the other 164 cells were not audited, so I do not
know whether any other arm did the same. gwc has the same sentence (`SKILL.md:78`, "Respond in the user's language"); that line is a
standing rule there, not a sub-clause. Also in that trace: `product-engineer facts` ran with the output of `git show` as its source
("numbers in the source: 9, 8, 359975633, ...", row 7, hash fragments counted as numbers) and the final answer reports `fail` and keeps it.

### 3c. Round 4 interim cells (no ours answers on disk; grader reasons from HEAD-TO-HEAD.md 877-883)

| Cell | Lost criterion and reason | Rival behaviour (what I could read) | Why ours did not |
|---|---|---|---|
| T3 (ours 4.00 vs 4.67 base, gwc-invoked) | objective-criteria miss, "not examined further" | Round 3 cells exist: base ran the price function ("`nightlyTotal(1.15, 1)` returns **1.14**"), gwc-invoked wrote "I did not run tests or the app" (`round-3/runs/T3-*-1/PR.md`). Ours round 3 wrote "I did not compare real totals before and after." | Not diagnosed in round 4; I did not read ours r4 answers (not on disk). |
| H2 (4.33 vs 5.00) | run 3 said "no change made" while the diff shows a regex and a test changed | dod and iso-invoked 5.00: no rule found that explains it | Claim of no change contradicting the diff; our hook has a `nochange` family (`bin/claim-gate.mjs:64`) added after the round. |
| H4 (4.33 tie) | misses on objective criteria, not examined | four arms at 4.33 | Not diagnosed. |
| H6 (4.33 vs 4.67) | runs 1 and 3 added text the source lacks (defined term, intro line, "This applies even though the licence has ended") | base, dod, dod-invoked 4.67 | `SKILL.md:107` bans added sections and sentences; round 5 text was not enough then; the `facts` echo check was added. |
| H1 (4.00 vs 4.67 gwc) | runs 1-3 asserted the starting state of the working tree without checking | dod-invoked's verify format makes the starting state an observed field (`verify.md:18-22, 48`) | `SKILL.md:71` and the `startstate` family (`claim-gate.mjs:29, 131`) came after this round. |

## 4. Technique map

Licence column: dod MIT, iso MIT, sp MIT (adaptable with attribution in THIRD_PARTY_NOTICES.md); gwc has no LICENSE file (idea only,
write in our own words). "Ours" cites files in this repository. A technique that fits only one seen task is rejected.

| Rival technique | Ours | General or task-specific | Licence | Decision |
|---|---|---|---|---|
| dod: fixed 7-section completion report with Claims/Evidence pairs (`dod SKILL.md:27-56`) | partly: `SKILL.md:71` (name the command behind each state claim); no fixed shape | general idea, fixed shape adds text | MIT | Reject the shape (adds a section list our refactor rule fixes at 3 lines, `SKILL.md:75-82`; cost). The claim-with-command pairing already exists. |
| dod: starting state as a measured Snapshot field (`verify.md:18-22`) | yes: `claim-gate.mjs:29,131`, `SKILL.md:71` | general | MIT | Have it. No change. |
| dod: replace-with-`return null` test question (`SKILL.md:21`) | partly: `SKILL.md:67` (tests that assert nothing); fix-ships-with-a-failing-test rule in section 3 | general | MIT | Reject: ours is equivalent and stronger (it asks to run the test without the fix). |
| dod: never skip/delete tests to go green (`SKILL.md:62`) | yes: `bin/stubs.mjs`, `SKILL.md:67` (skipped tests) | general | MIT | Have it. |
| dod: `not_applicable` plus reason for an unrunnable probe (`verify.md:51,63`) | yes: "not run and why", "not checked" (`SKILL.md:63-65,71`) | general | MIT | Have it. |
| dod: claims `Agree`/`Disagree`/`Unverifiable` via probes (`claim-validator.md:27-30`) | partly: `claim-gate.mjs` families; no per-claim probe table | general | MIT | Reject: a table in the answer adds length; no round 6 evidence it moves a score. |
| dod: separate validator subagents, final-judge (`agents/*`) | no | general | MIT | Reject: higher cost (0.0812-0.0904 vs 0.0737 USD per session, round 6) and round 6 shows no outcome gain. |
| dod: gates are no-ops unless the project opted in (`stop-gate.sh:21`, `pre-commit.sh:16`) | no: our Stop hook (`hooks/hooks.json`) runs in every session | general | MIT | Not adopted now. Our hook blocked 7 of 15 round 6 sessions once each and all 7 final answers kept the deliverable (`SUMMARY.md`). Reconsider only if an opt-in file is a product decision, which this analysis cannot decide. |
| dod: block reason with numbered next steps (`stop-gate.sh:82-86`) | yes, plus "write the complete final answer again" (`claim-gate.mjs:175`, `SKILL.md`) | general | MIT | Have it, ours is stricter on the final answer. |
| gwc: group by what a reader can use, not by commit (`SKILL.md:8,31`) | yes: `notes.mjs:104-106` messages, `SKILL.md:100-107` | general (changelog flavoured) | none | Have the idea. Reject copying the 4-8 section rule and emoji labels (style, changelog-only). |
| gwc: every bullet traceable to a commit, diff or file (`SKILL.md:99`) | partly: `SKILL.md:107` for rewrites only | general | none | Adapt in our words: extend "traces to a source" from rewrites to any text we write about a change. Evidence: the added-text loss class (section 6). |
| gwc: state the time window with timezone (`SKILL.md:12-15`) | no | task-specific (weekly window) | none | Reject: fits only changelog tasks. |
| gwc: read-only inspection, no tests (`SKILL.md:19`) | no, the opposite | task-specific | none | Reject: ours must run the project's tests (`SKILL.md:65-66`). |
| gwc: "Respond in the user's language" as a standalone rule (`SKILL.md:78`) | `SKILL.md:69`, inside the done-checks paragraph | general | none | Adapt: give the rule its own line. Cannot show it will change behaviour: the extra language came from machine-level settings (`SUMMARY.md`), which a skill line may not override, and a user instruction for another language must still win. |
| gwc: "if tests or builds were not run, say so" (`SKILL.md:102`) | yes `SKILL.md:63-65` | general | none | Have it. |
| iso: code, commands, direct quotes exempt from plain-language limits; accuracy beats plain language (`iso-24495-1/SKILL.md:30-34`, `iso-24495-3/SKILL.md:18-19`) | no: `bin/notes.mjs:58-62,107` forbids them | general (reader-by-reader) | MIT | Adopt as a principle, adapt in wording. Names the reader must type (option names, commands, file paths the reader opens) are not "code a reader cannot follow". Keep the error for internals the reader never sees. Evidence: X3 run 1. Do not special-case `--json`. |
| iso: know the reader and name the primary audience when audiences differ (`iso-24495-1/SKILL.md:14,20`) | partly: `SKILL.md:100-103` (use their nouns) | general | MIT | Adapt: the exemption above depends on who reads. The support-note task bans file and function names for a different reader, so the rule has to be by reader, not global. |
| iso: zero filler, no preamble (`iso-24495-1/SKILL.md:40-42`) | no | general, style only | MIT | Reject: no outcome criterion in any set measures it. |
| iso: sentence average 15-20, maximum 30 (`iso-24495-1/SKILL.md:45`) | yes: average 20, maximum 35 for rewrites (`SKILL.md:107`), `bin/readability.mjs` | general | MIT | Have it; our bound is looser, kept because H6 criterion 4 uses 35. |
| iso: banned words `shall`, `hereby` ... (`iso-24495-2/SKILL.md:38`) | no | task-specific (one criterion of one task) | MIT | Reject: overfits the licence task. |
| iso: keep a term of art and add a plain explanation (`iso-24495-2/SKILL.md:22-23`) | opposite: `SKILL.md:107` keeps the source's word and adds no sentence | task-specific | MIT | Reject: the added explanation is the added-text loss class. |
| iso: pre-output self-audit checklist (`iso-24495-1/SKILL.md:86-94`) | partly: `bin/facts.mjs`, `bin/readability.mjs` run on request | general | MIT | Reject: a checklist in the answer path adds cost; ours checks by command. |
| sp: "no completion claims without fresh evidence in this message" (`verification-before-completion/SKILL.md:14-20`) | yes: `SKILL.md:71` ("a command you ran this session") | general | MIT | Have it. Reject "in this message": it would force reruns and does not address the final-answer loss class. |
| sp: red flags and rationalization tables (`vbc/SKILL.md:50-72`) | no | general, long | MIT | Reject: length; no measured effect. |
| sp: red-green check of a regression test (`vbc/SKILL.md:84`) | yes: section 3, "undo the fix, run the test, put the fix back" | general | MIT | Have it. |
| sp: SessionStart hook injects the skill index each session (`hooks/session-start:20-41`; `using-superpowers/SKILL.md:11-13`: "1% chance" means use it) | no: `hooks/hooks.json` has no SessionStart | general | MIT | Reject for now: more context every session, and I found no cell where our skill failed to load. |

## 5. Second-best arms

### iso-24495 (commit 5951eb7, MIT), tied with gwc at 9 of 10

Loaded (natural): `output-styles/iso-24495.md` (469 lines) set as output style, plus skills `iso-24495-1` (105 lines), `-2` (132), `-3` (93),
`-5`, and `-4`/`-code`/`-text-audit` only for named work (`iso-24495-1/SKILL.md:98-105`; text-audit "never activate automatically", line 105).
Read: parts 1, 2, 3 up to line 60, the output style headings and lines 1-50.
Steps: know the reader and what they must do (1:14) -> answer first, no preamble (1:40-42) -> sentence/paragraph/voice/word rules (1:44-56)
-> layout rules (1:58-62) -> exact commands and paths (1:64-65) -> run the 6-point self-audit (1:86-94). Legal text adds modal-verb
rules, named actors, itemised conditions, defined terms, cross-references (2:34-58). Technical text adds purpose-architecture-detail order
and file:line citation (3:35-50).
Unrecognised input: conflicts resolve toward technical accuracy (1:33-34), legal enforceability (2:22-23); a part is activated only when
its domain matches (1:98-105).
Natural versus invoked: natural form gets the output style and skill descriptions; invoked form adds the prefix naming parts 1, 2, 3, 5.
Round 6: iso 4.00 and iso-invoked 4.00 on all tasks; public H6 iso 3.33 and iso-invoked 3.00 against ours 4.33, so on a rewrite task its
rules did not help. Cost 0.0551 (natural) and 0.0760 USD (invoked).
What we adopt from it (section 4): the exemption for names the reader must use, and by-reader judgement. What we do not: filler ban, banned
words, added explanations. Closing the X3 flag gap with iso's rule does not open a gap to iso, since iso never forbade the name.

### superpowers (commit 2ce8aa1, MIT), natural form and `sp-invoked`

Natural form injects `using-superpowers` at every session start (`hooks/session-start:20-41`) and says a skill that might apply 1% must be used (`using-superpowers/SKILL.md:11-13`);
user instructions rank above it (line 65). `sp-invoked` prefix: "Use the verification-before-completion skill before you give your final answer."
Steps of that skill: identify the proving command, run it fresh, read full output and exit code, verify, only then claim (`vbc/SKILL.md:27-33`).
Unrecognised input: no fallback; the skill states "Skip any step = lying, not verifying" (line 35).
Results: round 6 sp 4.00 on X1, X3-X5, 3.67 on X2; sp-invoked 4.00 on all; deep round sp-invoked X1 4.00, X2 0.00, X3 2.00 (ours 2.00, 0.67 on X3).
The technique overlaps `SKILL.md:71`; nothing in it forbids a user-facing name, so adopting the exemption in section 4 opens no gap to sp.
I did not read sp's other 13 skills.

## 6. General loss classes

These are stated without task names so a rule can be written from each. The evidence for each is in sections 1 and 3.

1. A pattern-based checker reports an item the reader needs (an option name, command or file the reader types) as an error, and the agent obeys it and leaves the item out.
2. The agent treats the output of a checker as a verdict when the checker states that it only flags candidates, including when the checker was run on text of the wrong kind (a diff or log as "the source").
3. The final answer is written in a language other than the language of the request.
4. A gate that forces a second turn makes the correction the whole final answer, so the deliverable is missing from the last message (fixed in `5d0cb0c`; 7 of 7 blocked round 6 answers kept it).
5. The answer states how the working tree or repository looked at the start of the session without a command that shows it.
6. A rewrite or note adds a sentence, definition or intro line that the source text does not contain.
7. The answer says nothing changed while the diff shows a change.
8. A document states a number, limit or behaviour that the code states differently, and nobody searched the code for it (all arms failed this in the deep round).
9. The answer reports a result of a check as "not run" or "failed" without saying what that means for the deliverable the person asked for (the confession replaces the report).
