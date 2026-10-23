# Reproduce r9 final

Needs: Node 22, git, Claude Code 2.1.308 logged in (the owner used a subscription login through a wrapper that sets an isolated HOME), bash 5 and GNU findutils for the dod arm, the arms fetched by `bench/head-to-head/fetch-arms.sh`. Work directories must not be below a directory that holds a `.claude/CLAUDE.md`.
1. Recompute every table without any model call: `node bench/head-to-head/final-r9/recompute.mjs bench/head-to-head/results/r9-final/public --check bench/head-to-head/results/r9-final/public/SCORES.txt` (same for `heldout-d`).
2. Sessions: `bash bench/head-to-head/final-r9/drive-final.sh public` and, for the held-out set, `bash bench/head-to-head/final-r9/extract-d.sh <dir>` then `drive-final.sh d <dir>`. The product commit is pinned in the driver. About 20 USD list price for the public set, about 9 USD for set d.
3. Grading: five joint votes per task with `PE_BENCH_REASON_FIRST=1 PE_BENCH_SEED=<1..5> node bench/head-to-head/grade.mjs --joint --tasks <list> --runs-dir <work>/runs`, moving each result to `<work>/grades-vote-<seed>`; re-ask close splits with seeds 6 and 7; `node bench/head-to-head/mergevotes.mjs <work> <work>/grades`.
4. Score: `node bench/head-to-head/final-score.mjs --runs-dir <work>/runs --grades <work>/grades --tasks <tasks.json> --labels <labels.json> --set-name <name>`.
5. F6-grader: three more votes (seeds 11 to 13) renamed `f6-vote-*`, then `node bench/head-to-head/final-r9/f6grader.mjs <work> <labels.json> f6/sample.json <public|d>`. F6-runs and F9: `f6runs-compare.mjs` and the same drivers with `PE_BENCH_MODEL`.
What will differ: model variance. Observed: F6-runs 18 of 26 and 15 of 17 re-run scores inside the original min-max.
