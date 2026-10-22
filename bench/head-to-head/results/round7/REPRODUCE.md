# Reproduce round 7 (development gate)
Needs Node 22+, Python 3, git, Claude Code 2.1.308, a key with spend allowed, and a `claude` wrapper on PATH that calls the Agent SDK (local shim, not in this repo).
1. Recompute the tables with no model call: `python3 -I score.py` and `python3 -I score.py --check`.
2. Tasks: `tasks/set-c/X1..X5` and `tasks/set-b/X1..X4` (`fixture.sh`, `task.json`, `ground-truth.md`); bench files `tasks/set-*.tasks.json`, `tasks/set-*.labels.json`.
   Set c was written for round 6 and set b for the deep round; both were already seen when used here. Set d (`tasks/AUTHOR-PROMPT-set-d.md` is its author prompt) is on a local branch and unused.
3. Pin ours: `git archive <commit> | tar -x -C <dir>` for 86c90cc (iteration 1) or c8541b3 (iteration 2).
4. Sessions: `devdrive.sh <name> <heldout dir> <prep dir> <commit> <tasks>`; grade: `grade3.sh <work dir> <prep dir> <tasks>` (placeholders `<RUNS>`, `<HOME>` stand for local paths).
Cost of a full rerun about 6 USD (54 sessions 4.15, 54 grader calls 1.91); time about 25 minutes. Model variance: the same cell moved by up to 2 outcome points between
iterations (set b X2: 2, 2, 2 then 2, 2, 0). F6 agreement was not measured.
