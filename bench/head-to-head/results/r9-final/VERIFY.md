# Verify r9 final (for another LLM or a person)

1. Protocol frozen before the runs: `git log --oneline -- docs/FINAL-PROTOCOL-r9.md` shows `5b4dcf5` before the first session driver commit; amendments A1 and A2 are in the same file and say when they were made.
2. Scores recompute: run the two `recompute.mjs --check` commands in REPRODUCE.md; both print OK. `public/cells.csv` and `heldout-d/cells.csv` hold every cell's outcome score.
3. No reused cells: every cell directory under `*/runs/` has a `cost.json` from this round; the dev-gate cells are in `results/r9-devgate/`, a different folder.
4. Grading: `*/grades-vote-*/` hold every vote; `*/grades/AGREEMENT.json` lists close splits; `*/grades/ERRORS.json` lists runs with fewer than three valid votes (empty).
5. Redaction: a recursive search of this folder for the home directory prefix finds nothing outside this sentence; the builder exits 1 on any leak.
6. The held-out set d was written by an agent that had not read this code; `heldout-d/` holds its fixtures verbatim; the controller of this round never read them.
7. Failed-by-limit sessions are not in the evidence; `SUMMARY.md` lists the incident.
