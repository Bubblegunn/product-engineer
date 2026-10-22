# Checklist for another LLM or reviewer

Open these files and run these commands. Each line says what it proves.

1. `python3 -I score.py --check` (exit 0): every table in `SUMMARY.md` equals the recomputation from the stored votes in `grades/`.
2. Protocol frozen before the runs: in the repository, `git log --format='%h %ad %s' --date=iso -n 6 -- docs/HEAD-TO-HEAD.md` shows `3314d7d`
   (diagnosis and hook decision), `a3c469d` (this protocol) before any session; the earliest `runs/` timestamps are in `cost.tsv`
   (rows `session X1-ours-1` and later were appended after the commits; their `ts` is the logging time, not the run time; the run
   time is in the work-directory log, not stored here). Compare `PROTOCOL.md` with `git show a3c469d:docs/HEAD-TO-HEAD.md`.
3. No reused cells: `runs/` holds 165 cells = 5 tasks x 11 arms x 3 reps (`find runs -name cost.json | wc -l` prints 165); the protocol says
   none are reused; `env.json` says `reused_cells: none`.
4. Held-out writer did not see the code: `tasks/AUTHOR-PROMPT.md` is the whole prompt of the author session (it ran in an empty directory
   with `--setting-sources project`; the prompt has the README problem sentence and the file format only). The controller did not read the
   tasks before the run: `heldout-prep.mjs` prints counts only (its output "5 tasks, 25 criteria, 20 outcome" is in the controller
   transcript, not stored). That claim rests on our statement; the files cannot prove it.
5. Redaction: `grep -rE '/Users/|sk-ant' .` prints only this line of VERIFY.md; e-mail addresses left are `dev@example.com`, `dana@example.com`
   (fixtures) and `noreply@anthropic.com` (commit trailer). Home paths are `<HOME>`, temp paths `<TMP>`, other e-mail `<EMAIL>`.
6. Grader independence: `grades/GRADER-PROMPT.txt` is the exact prompt; each `grades/vote-N/joint-Xn.prompt.txt` is the material one vote saw
   (anonymous labels, shuffled order); `labels.json` of each vote maps labels to runs. Spot-check: pick a cell in `runs/`, find its label
   in `grades/vote-1/labels.json`, read the grade file and compare the reason with `answer.md`.
7. Arms and pins: `arms.json`. Environment and the SDK-vs-CLI difference: `env.json`.
8. Honest scope: `SUMMARY.md` claims a failed held-out gate on a saturated set. Check that no sentence in it says "first" without
   the failure, and that the cost totals match `cost.tsv` (`awk -F'\t' 'NR>1{s+=$3}END{print s}' cost.tsv`).
9. `SHA256SUMS`: `shasum -a 256 -c SHA256SUMS` from this folder.
