#!/bin/sh
# Runs every task in evals/tasks under two conditions, bare and skill, with
# Claude Code in headless mode, and stores what the agent said and committed.
#
#   sh evals/run.sh              # all tasks, both conditions
#   sh evals/run.sh 03 skill     # one task prefix, one condition
#   PE_EVAL_RUNS=3 sh evals/run.sh   # three runs per arm, results/<task>/<condition>/run-N
#
# Requires the `claude` CLI, logged in. Each run costs real tokens.
# Only project-level settings are loaded (--setting-sources project) so the
# machine's own CLAUDE.md and skills cannot leak into the bare condition.
set -eu
root=$(cd "$(dirname "$0")/.." && pwd)
tasks_dir="$root/evals/tasks"
results_dir="$root/evals/results"
filter="${1:-}"
only_condition="${2:-}"
model="${PE_EVAL_MODEL:-}"
runs="${PE_EVAL_RUNS:-1}"
mkdir -p "$results_dir"

for task in "$tasks_dir"/*/; do
  name=$(basename "$task")
  case "$name" in "$filter"*) ;; *) continue ;; esac
  for condition in bare skill; do
    if [ -n "$only_condition" ] && [ "$condition" != "$only_condition" ]; then continue; fi
    for run in $(seq 1 "$runs"); do
    if [ "$runs" = 1 ]; then out="$results_dir/$name/$condition"; else out="$results_dir/$name/$condition/run-$run"; fi
    mkdir -p "$out"
    work=$(mktemp -d)
    cp -R "$task"/. "$work"/
    rm -f "$work/TASK.md"
    if [ "$condition" = "skill" ]; then
      mkdir -p "$work/.claude/skills/product-engineer"
      cp -R "$root/skills/product-engineer"/. "$work/.claude/skills/product-engineer"/
    fi
    (
      cd "$work"
      git init -q -b main
      git -c user.name=Fixture -c user.email=fixture@example.com add -A
      git -c user.name=Fixture -c user.email=fixture@example.com commit -q -m "fixture"
    )
    # The request is the body of TASK.md after the front matter.
    prompt=$(awk 'BEGIN{fm=0} /^---$/{fm++; next} fm>=2{print}' "$task/TASK.md")
    if [ "$runs" = 1 ]; then echo "== $name / $condition"; else echo "== $name / $condition / run $run"; fi
    set +e
    (
      cd "$work"
      env -u CLAUDECODE claude -p "$prompt" \
        --output-format json \
        --max-turns 25 \
        --permission-mode acceptEdits \
        --setting-sources project \
        --allowedTools "Edit,Write,Bash,Read,Glob,Grep,Skill" \
        ${model:+--model "$model"} \
        > "$out/transcript.json" 2> "$out/stderr.txt"
    )
    status=$?
    set -e
    echo "$status" > "$out/exit.txt"
    node -e '
      const fs = require("fs");
      let d = {};
      try { d = JSON.parse(fs.readFileSync(process.argv[1], "utf8")); } catch {}
      fs.writeFileSync(process.argv[2], (d.result || "") + "\n");
      fs.writeFileSync(process.argv[3], JSON.stringify({ model: Object.keys(d.modelUsage || {}).join(",") || null, cost_usd: d.total_cost_usd || null, turns: d.num_turns || null, duration_ms: d.duration_ms || null }) + "\n");
    ' "$out/transcript.json" "$out/final.md" "$out/meta.json"
    (
      cd "$work"
      if [ "$(git rev-list --count HEAD)" -gt 1 ]; then
        git log -1 --format=%B > "$out/commit.txt"
        git diff --name-only HEAD~1 HEAD > "$out/changed.txt"
      else
        : > "$out/commit.txt"
        git status --porcelain | awk '{print $2}' > "$out/changed.txt"
      fi
    )
    rm -rf "$work"
    done
  done
done
echo "done: results in $results_dir"
