# Evals

A small, reproducible before/after of what the skill changes in a coding agent.

- `tasks/` holds eight tiny repositories, each with a `TASK.md` whose front matter lists the files the request should touch and whose body is the request in a stakeholder's voice.
- `run.sh` runs every task twice with Claude Code in headless mode: `bare` (nothing installed) and `skill` (this skill copied into `.claude/skills/`). Only project settings are loaded, so the machine's own CLAUDE.md and skills cannot leak into the bare condition. Each run's final message, commit message and changed files land in `results/<task>/<condition>/`.
- `score.mjs` applies five yes/no heuristics and prints the table in `RESULTS.md`. With `PE_EVAL_RUNS=3` each arm runs three times per task, results land in `run-N/` directories, and the table gains a seeded bootstrap interval on the mean per-task delta.
- `judge.mjs` asks a model which of the two commit messages is truer to the diff, in a random order per pair; it prints the pair count and cost and runs nothing without `--yes`.
- `BENCHMARK.md` is the design for a fifty-diff measurement on public commits. Design only.

```
sh evals/run.sh                 # 16 headless runs, costs real tokens
PE_EVAL_RUNS=3 sh evals/run.sh  # 48 runs
node evals/score.mjs            # table + per-task rows
node evals/judge.mjs            # pair count and cost; add --yes to judge
```

The heuristics are regular expressions over the agent's own words and `git diff --name-only`. They are cheap and blunt on purpose; `RESULTS.md` lists what they miss.
