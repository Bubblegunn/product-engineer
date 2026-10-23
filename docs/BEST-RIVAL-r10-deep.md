# Best-rival analysis, round r10, Phase A (deep, from source; 2026-10-24)

Method: four read-only research passes on git archive copies (nothing executed): dod-guard (MIT), iso-24495 (MIT), git-weekly-changelog (no licence file: ideas only), superpowers, compound-engineering, groundtruth, Anthropic's plugins, danger-js, commitlint, gitleaks, reviewdog and others. Full capability tables with file:line are in `docs/rival-notes-r10/` (dod-guard.md, iso-24495-and-gwc.md, others.md); this file keeps the decision per row. Licences: MIT/Apache/BSD code may be adapted with the copyright line in `THIRD_PARTY_NOTICES.md`; everything else is reimplemented from the idea. Rows marked D-loss come from the held-out d diagnosis (r10 start).

## Decisions (every row where a rival is better or we lack the capability)

| # | Capability | Source (licence) | We have it? | Decision | Where |
|---|---|---|---|---|---|
| 1 | Second copy of a buggy expression (D-loss: X4) | none had it; dod-invoked found it by reading wider | no (done in r10: `twins`) | DONE | `bin/twins.mjs` |
| 2 | Renamed option for integrators (D-loss: X3) | none; base wrote it by hand | no (done: `--audience developers`, names-gone) | DONE | `bin/notes.mjs`, `bin/range.mjs` |
| 3 | One deterministic verdict at the end of a turn (tests ran, stubs, evidence) | dod-guard stop-gate (MIT) | partly (phrases only) | ADOPT as B1 verification loop | `bin/verify.mjs`, `claim-gate.mjs` |
| 4 | Read the RESULT of the last test run (pass/fail counts), not only that one ran; runner autodetect (pytest, jest, vitest, go, cargo, npm) | dod-guard run-full-suite.sh, groundtruth tests verifier (MIT) | no | ADOPT in B1 (parse tool_result of the test command; fail finding if red) | `verify.mjs` |
| 5 | Red-green evidence: the test failed before the fix and passed after | proof redgreen.py, superpowers (MIT) | partly (a test file written) | ADOPT in B1 as `fix-not-redgreen` (the same test command failed earlier in the session, then passed) | `verify.mjs` |
| 6 | Stub/TODO scan of the session's own change at Stop | dod-guard post-edit/stop (MIT) | command only (`stubs`) | ADOPT in B1 (stubs on the added lines of the session change) | `verify.mjs` |
| 7 | Unwired new file (added file referenced nowhere) | dod-guard /dod:confess section 5 | no | ADOPT in B1 as candidates, allowlist tests/docs/config/entry points | `verify.mjs` |
| 8 | Suspicious return (action-named function that only returns an empty literal) | dod-guard detect-suspicious-returns.py (MIT) | no | ADOPT, JS and Python, warn level, first-token-of-name rule | `bin/stubs.mjs` |
| 9 | Claim families "pushed / deployed / published / live" need a check after the last push | groundtruth done family, landed (idea) | no | ADOPT in B2 | `claim-gate.mjs` |
| 10 | Count, range-summary and "nothing else uses this" claims route to tools | owner request, groundtruth claims | partly (`claims` command) | ADOPT as B2 | `claim-gate.mjs` |
| 11 | Second reviewer pass over the answer (claim-validator) | dod-guard claim-validator agent (MIT, LLM) | no | ADOPT cheap form as B3 (one Haiku call, unchecked claims only) | `bin/second-eye.mjs` |
| 12 | Prepared repository context at session start | dod-guard session-start.sh (MIT) | no | ADOPT as B4 brief | `bin/brief.mjs` |
| 13 | Session baseline ref (what this session changed, exactly) | proof baseline.py (idea) | no | ADOPT: `git stash create` ref recorded by the brief hook | `brief.mjs`, `verify.mjs` |
| 14 | Notes line traceability: every note line maps to a commit subject, path or diff token in the range | gwc rule 10 (idea; nobody enforces it) | no | ADOPT in `notes --range` (warning) and in B1 check 4 | `bin/notes.mjs` |
| 15 | Empty section heading; empty notes; quiet-window template | gwc (idea) | no | ADOPT (warnings) | `notes.mjs` |
| 16 | `--first-parent` mode and `--since` window for `range` | gwc (idea) | no | ADOPT | `range.mjs` |
| 17 | ~30 of gitleaks' highest-yield token rules, keyword prefilter, entropy floor | gitleaks (MIT, copyright line kept) | 11 rules | ADOPT (secret detector widening, values never printed) | `bin/diff.mjs` |
| 18 | Publish guards: `gh pr create` with empty body; commit with no pathspec while unrelated paths are staged; `--no-verify` | CE ce-commit-push-pr (MIT), dod-guard pre-commit | no | ADOPT in commit-guard | `commit-guard.mjs` |
| 19 | Quote-the-line gate (a quoted snippet really appears at the cited file:line) | CE findings schema (MIT) | path exists only | ADOPT small | `bin/references.mjs` |
| 20 | commitlint rules at warn level (header length, body blank line, `!` agrees with BREAKING, trailer form) | commitlint (MIT) | partly | ADOPT four warn rules | `bin/check.mjs` |
| 21 | Sentence splitter with two readings, filler-opening check, undefined acronyms | iso-24495 (MIT) | splitter yes (r8-3) | SKIP the rest: wording quality, not correctness; English-only | n/a |
| 22 | Wordy phrase, doublet, double-negative rules | iso-24495 (MIT) | no | SKIP (low value for the job; style) | n/a |
| 23 | Strictness levels; verify marker with TTL; coverage delta; multi-auditor LLM panels | dod-guard (MIT) | no | SKIP: the marker is forgeable and levels change nothing in the rival (rival defect), coverage/auditors cost more than they add | n/a |
| 24 | Stop gate that reads only the whole project (old TODO fails today's work) | dod-guard (defect) | n/a | DO NOT COPY: ours scans the session's change only | n/a |
| 25 | Rival defects found (recorded, none confirmed by running): failing tests counted as passing (`|| true; rc=$?`), commit gate registered PostToolUse so it cannot stop a commit | dod-guard | n/a | informational | n/a |

Order of implementation (one implementer at a time): B1 (rows 3 to 7, 13, 14), B2 (9, 10), B3 (11), B4 (12, 13), notes and range additions (14 to 16), detector widening (8, 17, 18, 19, 20). Rows 21 to 23 are skipped by decision.

Strong-rival read: dod-guard is the only rival with a Stop gate and hooks; its deterministic part (stubs, test run) is ours already or smaller; its extra value is the report shape and LLM auditors. iso-24495 and gwc are writing-quality tools that never read a diff. The unique ground is claims checked against the repository, which B1 to B4 extend.
