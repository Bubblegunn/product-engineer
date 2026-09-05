# Results

Run on 5 September 2026 with Claude Code 2.1.261, model `claude-opus-5` (the CLI also used
`claude-haiku-4-5` for its own housekeeping calls). One run per task per condition, 16 runs,
about $7 in total. Same tasks, same prompts, same flags; the only difference is whether
`skills/product-engineer/` was present in the repository's `.claude/skills/`.

| metric | bare (n=8) | skill (n=8) | delta |
|---|---|---|---|
| Commit carries the For-the-customer block | 0 / 8 | 8 / 8 | +8 |
| Final message reports an observation or says what it could not check | 1 / 8 | 7 / 8 | +6 |
| Final message names something deliberately not done | 2 / 8 | 7 / 8 | +5 |
| Every number in the final message has a method or scope next to it | 1 / 8 | 1 / 8 | +0 |
| Only the requested files changed (tests and documentation allowed) | 8 / 8 | 8 / 8 | +0 |

Read it as a smoke test, not a study: eight tasks, one run each, no repetition, no
statistics. What it does show is that the three behaviours the skill is mostly about, the
customer block, done-means-observed, and naming what was left out, went from rare to
nearly always in the runs where the skill was present.

Rescored on 5 September 2026 with two heuristic fixes, without rerunning anything:
the number heuristic now strips code spans and fenced blocks and ignores versions, issue
numbers, years and hashes before it looks for a bare number, and the scope heuristic
treats documentation files as documentation rather than scope creep (the per-task table
still shows, as "docs elsewhere", when the agent wrote to a Markdown file the task did not
list). The first two scored rows moved as a result and are reported as measured:

- Numbers with a method next to them: 1 of 8 in both conditions. Under the old heuristic a
  backtick anywhere in the sentence counted as a method, which flattered both arms; without
  it, most sentences that mention a count in either condition state it bare. The skill did
  not move this in one run per task, and the row says so.
- Only the requested files changed: 8 of 8 in both conditions once documentation is allowed.
  Four skill runs and three bare runs wrote to README.md; the skill neither caused nor
  prevented that, and the column next to it now records it instead of penalising it.

Cost: the skill runs used about 60% more turns and 45% more cost on average (18.5 turns and
$0.53 against 11.5 turns and $0.37), because they verified more and wrote more. That is the
price of the behaviour, and it is stated here so nobody discovers it later.

## Per task

| task | condition | customerBlock | observedOrHonest | notShipped | numbersWithMethod | scopeRespected | docs elsewhere | turns | cost |
|---|---|---|---|---|---|---|---|---|---|
| 01-export-safari | bare | no | yes | yes | no | yes | no | 13 | $0.35 |
| 01-export-safari | skill | yes | yes | yes | yes | yes | no | 18 | $0.56 |
| 02-notification-badge | bare | no | no | no | no | yes | no | 10 | $0.25 |
| 02-notification-badge | skill | yes | yes | yes | no | yes | yes | 21 | $0.50 |
| 03-refactor-pricing | bare | no | no | no | yes | yes | yes | 12 | $0.39 |
| 03-refactor-pricing | skill | yes | no | yes | no | yes | yes | 16 | $0.49 |
| 04-slow-report | bare | no | no | no | no | yes | no | 17 | $0.81 |
| 04-slow-report | skill | yes | yes | no | no | yes | no | 28 | $0.93 |
| 05-timezone-count | bare | no | no | no | no | yes | yes | 14 | $0.49 |
| 05-timezone-count | skill | yes | yes | yes | no | yes | yes | 19 | $0.63 |
| 06-invoice-typo | bare | no | no | yes | no | yes | no | 6 | $0.16 |
| 06-invoice-typo | skill | yes | yes | yes | no | yes | no | 13 | $0.28 |
| 07-webhook-retry | bare | no | no | no | no | yes | no | 10 | $0.29 |
| 07-webhook-retry | skill | yes | yes | yes | no | yes | no | 15 | $0.47 |
| 08-remove-coupons | bare | no | no | no | no | yes | yes | 10 | $0.21 |
| 08-remove-coupons | skill | yes | yes | yes | no | yes | yes | 18 | $0.39 |
