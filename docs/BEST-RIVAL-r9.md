# Best-rival analysis and plan, round r9 (research, design and implementation only; no measurement)

Written 2026-10-23 on `plugin-leadership`, before any r9 code. Nothing here changes criteria, checks, tasks or the win rule.
No benchmark, grading call or `claude -p` call was made. No held-out branch or folder was opened.
Launch claim being worked towards (SPEC 2b): claim I1, "first in total": in each set the 95% bootstrap interval of
(ours minus the best other arm's total) lies above zero.

## 1. Why we tie or lose, and where plain Claude saturates

Sources: `~/claude-kredi-runs/2026-10-22/LOSS-ANALYSIS.md`, the r6, r7, r8 reports, `docs/BEST-RIVAL-r7.md`, `docs/BEST-RIVAL-r8.md`,
`docs/HEAD-TO-HEAD.md` (round 3 table, lines 551-575; round 4 interim, 854-888), `bench/head-to-head/results/round6/SUMMARY.md` (read only for skill-call counts).

Facts that decide the plan:

1. I1 cannot be reached on a saturated set. r6: eight arms at 20.00 of 20, ours 19.67. The best other arm's total is at the ceiling,
   so the difference of totals is at most 0 and its interval cannot lie above zero. Winning needs tasks where plain Claude and the rivals lose points.
2. Plain Claude (Sonnet 5.5) already writes a good commit message, PR text and a rewrite. Round 3 public table: base ties or sits within 0.33 of
   ours on T3, H1, H6 (HEAD-TO-HEAD.md lines 560-575). Rewriting rules cannot beat a model that already writes the obvious thing.
3. The tasks where the gap to every other arm was large are not about prose. They are about **what the agent does to the repository
   and what it checks before it speaks**: H5 (a secret staged inside a mixed change) ours 5.00 against 2.00 for every other arm; H3 (an
   endpoint whose gateway is "later") ours 5.00 against 3.00. T4 (release notes over a range with a revert, a docs commit and a version bump) is the
   hardest public task for everyone: ours 3.33, best rival 2.67, nobody above 3.33 of 5 (round 3 table).
4. Our own hook and checker caused the r6/r7 losses (final answer replaced by the hook text; `notes` rejecting `--json`), not a missing technique.
   Both fixed in r6/r8 (`3314d7d`, `86c90cc`, `bcb9f6c`).
5. The skill is loaded in our arm: the r6 traces show `Skill product-engineer:customer-block` in the first tool call of the sampled
   run (`results/round6/runs/X1/ours/1/trace.jsonl`, line 1). The workproof-style trigger gap does not apply to us. What is
   unproven is whether prose rules (which the model may follow or skip) change outcomes; a hook or a command cannot be skipped.

Conclusion: the product-engineer outcomes where a plugin can be **clearly** better are the ones a prompt cannot reliably deliver and
a deterministic mechanism can:

- U1 "Nothing I should not have shared leaves with the commit": secrets, conflict markers and junk staged by `git add -A` or `git commit -a`.
- U2 "Release notes that match the net result of the range": reverted work is not announced, docs/test/version-only commits are not announced, a security
  or performance commit is flagged for care, a commit whose type lies about its files is flagged.
- U3 (already shipped in r8, unmeasured): "no claim without evidence" (`claims`, `addedtests`).

## 2. Rivals and public tools, read for these outcomes

Licences were read from the repository files or the GitHub page; code is not copied, ideas only unless stated.

| Gap | Evidence (file:line or URL) | What users get | Licence | Adopt |
|---|---|---|---|---|
| G1 A hook that acts at `git commit` time, with no skill needed | dod-guard `hooks/handlers/pre-commit.sh:24-41` (reads `tool_input.command`, acts only on `git commit`, rejects `--no-verify`); commit `be038f7` | The commit is stopped before it lands, so a leaked file is never in history | MIT (`/tmp/rivals/dod-guard/LICENSE`) | YES, idea only; ours is a PreToolUse deny, theirs a PostToolUse block that needs `.dod-guard.json` |
| G1b Secret detection beyond file names | gitleaks rule model: regex + keywords + optional entropy + allowlists (github.com/gitleaks/gitleaks, 30.2k stars) | Catches a cloud key or token pasted into an ordinary source file | MIT | YES, idea only; own regex list, high precision, no entropy rule (false alarms) |
| G1c Anthropic's `/commit` only tells the model "avoid secrets" (prompt, no enforcement) | github.com/anthropics/claude-plugins-official/tree/main/plugins/commit-commands (README) | n/a: shows the official commit flow has no enforcement | MIT (README) | context only |
| G2 Reverted work must not be announced | T4 ground truth (`docs/HEAD-TO-HEAD.md:186-215`); nobody above 3.33/5 in round 3; ReleaseEval (arXiv 2511.02713): models do best with commit-tree structure and "struggle when working from long code diffs" | Notes the owner can trust: no announcement of a feature that was taken back | paper; no code used | YES: a `range` ledger that gives the model the structure (net of reverts, classes) |
| G2b Message-code inconsistency is the main failure of agent PRs | arXiv 2601.04886: 23,247 agent PRs, 406 (1.7%) high inconsistency, most common type "claims unimplemented changes" 45.4%, acceptance 28.3% vs 80.0% | A reviewer is told when a commit type contradicts its files | CC BY 4.0 (paper) | YES for the type-versus-files check in `range` |
| G2c CodeFuse-CommitEval: purpose-level inconsistency is the hardest type for LLMs; precision 80%, specificity 63.8% | arXiv 2511.19875 | Evidence that an LLM judge is the wrong tool for this check; a path-class rule is cheap and exact | paper CC BY 4.0 | YES (deterministic only; no model judge) |
| G3 Tests-added claims need a test-file write | groundtruth idea, adopted in r8 (`claim-gate.mjs` `addedtests`) | already shipped | MIT | done in r8 |
| G4 Other plugins | superpowers `verification-before-completion/SKILL.md:52-71` (prompt gate, no hook), compound-engineering `ce-commit` (`git add <paths>`, never `-A`), git-weekly-changelog rule 10 (`SKILL.md:99`, "traceable to a commit") | prose only | MIT / MIT / none | already compared in BEST-RIVAL-r8 section 2; nothing new |
| G5 Others for the same job | release-please, git-cliff, conventional-changelog (BEST-RIVAL-r8 section 3), Anthropic `pr-review-toolkit` (comment-analyzer, pr-test-analyzer, silent-failure-hunter; MIT per README) | review agents run on request; none checks the message against the diff or the staged index | Apache-2.0 / Apache-2.0 / ISC / MIT | no: different job, model-based |
| G6 Benchmarks of the category | ReleaseEval (arXiv 2511.02713, 94,987 release notes, 6 languages), CodeFuse-CommitEval (2511.19875, built on ApacheCM), AIDev (2602.09185, 33,596 agent PRs). No benchmark scores "was a secret kept out of the commit" or "was a reverted change announced". | We cannot run a public benchmark that we do not fail by construction; our own development tasks (section 5) must cover U1 and U2 | papers | note only |

What the rivals do **not** have, checked in BEST-RIVAL-r8 section 2 and the pages above: any check that runs at commit time with no configuration file;
any reading of a range as net-of-reverts; any "the commit type says docs but the commit touches source" flag.

## 3. Rulings (written before the code)

R9-1 Adopt G1: a PreToolUse hook on Bash that denies a command which would commit a secret-looking file or value, a merge-conflict marker, or a staged junk path.
 It acts on the commit itself, so it works whether or not the skill was loaded. Deny messages tell the agent exactly which path and what to do
 (`git restore --staged <path>`), and a command prefixed `PE_ALLOW_STAGED=1` passes (for the case where the person asked for that file by name).
 `PRODUCT_ENGINEER_NO_GATE=1` turns it off, as for the Stop hook. Alternatives rejected: warn only (the model ignores warnings; H5 needed an unstage), entropy rules (false alarms), running the tests (cost).
R9-2 Detection list is high precision: private key header; provider token prefixes (AWS access key id, GitHub, Slack, Google API key, Anthropic and OpenAI style `sk-` keys, Stripe live keys);
 a URL with an inline password; `_authToken=` in an npmrc; the existing assignment rule. Same list is used by `check --diff` so the checker and the hook agree. The 59-commit baseline (`evals/baseline`) must stay at 0 false alarms.
R9-3 Adopt G2: `product-engineer range <from>..<to>` prints a ledger, not a verdict: each commit with class (docs, test, version-only, source, config), net-cancelled pairs
 (a `Revert "..."` subject or a `This reverts commit <sha>` body, including a revert of a revert), and flags (security wording, performance wording with no measurement in the range, breaking-change marker,
 type contradicts files). Output wording is "candidates" and cites the sha. No model, no network.
R9-4 `notes <file> --range <r>` reports an error when a line outside a "Not in this release" section repeats the distinctive words of a commit the range cancelled. It is an error, not a warning, because T4 criterion 4 is exactly this failure. Low precision is bounded by requiring two shared words of at least five letters, or one when the subject has only one.
R9-5 The release-notes skill and the main skill each get one sentence: run `range` before writing, and write nothing for a cancelled commit.
R9-6 Not adopted: LLM judge for message-diff consistency (CodeFuse numbers above), entropy-based secret rules, test re-run inside a hook (cost, r8 ruling), a Stop-hook rewrite.
R9-7 No existing task, criterion, check script or grader prompt is edited. New code only, plus the skill sentences. The r8 grader-evidence change (r8-0b) stays as the owner left it.
R9-8 The hook may be wrong in two ways: it blocks a commit that should pass (cost: one turn; the deny text names the escape), or it misses a secret (no worse than today). A false-positive test list and a mutation check come with each detector.

## 4. Plan (tasks, files, tests, gap closed)

| Task | Files | Tests | Closes |
|---|---|---|---|
| T1 provider-token and URL-password rules in the shared secret detector, plus a conflict-marker detector | `bin/diff.mjs`, `test/diff.test.mjs` | one positive and one near-miss negative per rule; baseline test must show 0 false alarms | G1b |
| T2 `bin/commit-guard.mjs`, `hooks/hooks.json` PreToolUse entry, adapters regenerated | `bin/commit-guard.mjs`, `hooks/hooks.json`, `test/commit-guard.test.mjs`, `scripts/generate-adapters.mjs` output | real temporary git repositories: staged `.env`; token in a source file; `git add -A` with an untracked key; `git commit -a`; chained `git add x && git commit`; `PE_ALLOW_STAGED=1`; a clean commit passes; a non-git Bash command passes; malformed stdin exits 0 | G1 |
| T3 `bin/range.mjs` and the `range` command | `bin/range.mjs`, `bin/check.mjs`, `test/range.test.mjs` | temporary repository reproducing the T4 shape (feature, docs, security fix, revert, version bump, fix, perf) built inside the test, plus revert-of-revert and a type-contradicts-files commit | G2, G2b |
| T4 `notes --range` and the skill sentences | `bin/notes.mjs`, `skills/release-notes/SKILL.md`, `skills/product-engineer/SKILL.md`, adapters, `test/notes.test.mjs` | announced-after-revert fails; same words under "Not in this release" pass; unrelated notes pass | G2 |

Each task: Haiku 5.5 implementer, Sonnet 5.5 reviewer, one at a time, red test first, a mutation check per new test (break the code, see the test fail), `npm test`, `claude plugin validate --profile directory --strict`.
The test fixtures for T3 are built in the tests from scratch; they do not copy the benchmark fixtures or any held-out material.

## 5. What is not done and why

- The development gate is only proposed (`docs/DEV-GATE-r9.md`); nothing was run.
- The hook behaviour inside a real Claude Code session was not exercised (no `claude -p` allowed). The hook input and output shape (`tool_name`, `tool_input.command`, `hookSpecificOutput.permissionDecision`) follows the Claude Code hooks documentation; the first dev-gate cell must confirm it with a transcript (check 1 of the proposal).
- Hugging Face datasets and npm/PyPI searches for other claim checkers were not repeated; BEST-RIVAL-r8 section 3 covers them.
