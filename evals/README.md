# Evals

A small, reproducible before/after of what the skill changes in a coding agent.

- `tasks/` holds eight tiny repositories, each with a `TASK.md` whose front matter lists the files the request should touch and whose body is the request in a stakeholder's voice.
- `run.sh` runs every task twice with Claude Code in headless mode: `bare` (nothing installed) and `skill` (this skill copied into `.claude/skills/`). Only project settings are loaded, so the machine's own CLAUDE.md and skills cannot leak into the bare condition. Each run's final message, commit message and changed files land in `results/<task>/<condition>/`.
- `score.mjs` applies five yes/no heuristics and prints the table in `RESULTS.md`.

```
sh evals/run.sh          # 16 headless runs, costs real tokens
node evals/score.mjs     # table + per-task rows
```

The heuristics are regular expressions over the agent's own words and `git diff --name-only`. They are cheap and blunt on purpose; `RESULTS.md` lists what they miss.
