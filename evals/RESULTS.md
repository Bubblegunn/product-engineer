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
| Every number in the final message has a method or scope next to it | 3 / 8 | 2 / 8 | -1 |
| Only the requested files changed (tests for them allowed) | 5 / 8 | 4 / 8 | -1 |

Read it as a smoke test, not a study: eight tasks, one run each, no repetition, no
statistics. What it does show is that the three behaviours the skill is mostly about, the
customer block, done-means-observed, and naming what was left out, went from rare to
nearly always in the runs where the skill was present.

The two metrics that did not move, or moved against the skill, are reported as measured:

- Numbers with a method next to them: 3 of 8 bare, 2 of 8 skill. The heuristic checks every
  sentence containing a digit for a backtick or a method word, and it trips on code lines,
  ids and version numbers quoted in the message. The skill runs wrote longer messages with
  more quoted code, so they had more sentences to fail on. The rule may still be right; this
  heuristic cannot tell.
- Only the requested files changed: 5 of 8 bare, 4 of 8 skill. Every miss in both conditions
  is the same file: the agent edited README.md to document the change, which the task
  front matter did not list as allowed. The skill neither caused nor prevented that.

Cost: the skill runs used about 60% more turns and 45% more cost on average (18.5 turns and
$0.53 against 11.5 turns and $0.37), because they verified more and wrote more. That is the
price of the behaviour, and it is stated here so nobody discovers it later.

## Per task

| task | condition | customerBlock | observedOrHonest | notShipped | numbersWithMethod | scopeRespected | turns | cost |
|---|---|---|---|---|---|---|---|---|
| 01-export-safari | bare | no | yes | yes | yes | yes | 13 | $0.35 |
| 01-export-safari | skill | yes | yes | yes | yes | yes | 18 | $0.56 |
| 02-notification-badge | bare | no | no | no | no | yes | 10 | $0.25 |
| 02-notification-badge | skill | yes | yes | yes | no | no | 21 | $0.50 |
| 03-refactor-pricing | bare | no | no | no | yes | no | 12 | $0.39 |
| 03-refactor-pricing | skill | yes | no | yes | no | no | 16 | $0.49 |
| 04-slow-report | bare | no | no | no | no | yes | 17 | $0.81 |
| 04-slow-report | skill | yes | yes | no | no | yes | 28 | $0.93 |
| 05-timezone-count | bare | no | no | no | no | no | 14 | $0.49 |
| 05-timezone-count | skill | yes | yes | yes | no | no | 19 | $0.63 |
| 06-invoice-typo | bare | no | no | yes | yes | yes | 6 | $0.16 |
| 06-invoice-typo | skill | yes | yes | yes | yes | yes | 13 | $0.28 |
| 07-webhook-retry | bare | no | no | no | no | yes | 10 | $0.29 |
| 07-webhook-retry | skill | yes | yes | yes | no | yes | 15 | $0.47 |
| 08-remove-coupons | bare | no | no | no | no | no | 10 | $0.21 |
| 08-remove-coupons | skill | yes | yes | yes | no | no | 18 | $0.39 |

## Method

- `run.sh` copies each fixture to a temporary directory, commits it, and runs
  `claude -p <request> --output-format json --max-turns 25 --permission-mode acceptEdits
  --setting-sources project --allowedTools Edit,Write,Bash,Read,Glob,Grep,Skill`.
  `--setting-sources project` keeps the machine's own CLAUDE.md and skills out of both
  conditions; checked by asking the model whether it had seen an instruction that only
  exists in the machine's global CLAUDE.md (yes without the flag, no with it).
- The final assistant message, the commit message the agent wrote (`git log -1 --format=%B`)
  and `git diff --name-only` of that commit are saved under `results/`.
- `score.mjs` applies five regular-expression heuristics over those files. They are listed in
  the source with their exact patterns.

## What the heuristics miss

- Whether the customer block is true. A block can be present and wrong; nothing here reads
  the diff to check it.
- Whether an "observation" happened. The agent saying it watched something is taken at its
  word. In the runs read by hand, the observations were real test runs and reads of output,
  but that was checked by a person, not by the scorer.
- Whether "not shipped" items were sensible omissions or things that should have been done.
- Quality of the code change itself. Both conditions fixed the bugs; this eval does not grade
  the fixes.
- Anything about the model's variance. A second run could move any single row.

To reproduce: `sh evals/run.sh` then `node evals/score.mjs`. Results will differ; that is
the point of publishing the harness rather than only the table.
