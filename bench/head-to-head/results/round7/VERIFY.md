# Verify round 7 (for another LLM)
1. `python3 -I score.py --check` must print "SUMMARY.md matches score.py output" (scores recompute from `grades/` with no model call).
2. `shasum -a 256 -c SHA256SUMS` must report no failure.
3. Order: `git log --oneline` shows 554a60e (best-rival analysis) and 5de606a (design freeze) before 86c90cc (code), and the iteration 1 record before c8541b3.
4. No reuse: every cell in `runs/iter1` and `runs/iter2` is a new session; each has `cost.json`. 54 cells expected (27 per iteration).
5. Redaction: `grep -r "/Users/" .` finds only this line's pattern; no `sk-ant`.
6. Held-out writer: set d was written by a fresh Sonnet session in an empty directory with `--setting-sources project`; its prompt is `tasks/AUTHOR-PROMPT-set-d.md`; the controller did not read the tasks (counts only: 5 tasks, 25 criteria, 20 outcome).
7. SUMMARY states the gate failed; nothing in it claims "first".
