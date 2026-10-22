# Reproduce round 6

Needs: Node 20+, Python 3, git, Claude Code 2.1.308, an Anthropic API key with spend allowed, bash. Cost of a full rerun: about
15 USD (165 sessions about 11 USD, 15 grader calls about 3 USD, the held-out author about 0.2 USD); time about 25 minutes for
the sessions (parallelism 3) and 15 minutes for grading. Paths below use placeholders: `<REPO>` is a clone of
`Bubblegunn/product-engineer` on `plugin-leadership`, `<WORK>` an empty directory.

1. Recompute the tables without any model call: `cd <this folder> && python3 -I score.py` and `python3 -I score.py --check`.
2. Held-out tasks: `tasks/heldout/X1..X5/{fixture.sh,task.json,ground-truth.md}`; the author prompt is `tasks/AUTHOR-PROMPT.md`
   (re-running the author gives different tasks; use the stored ones). Build one fixture: `mkdir t && bash tasks/heldout/X3/fixture.sh "$PWD/t"`.
   Tasks file for the bench: `tasks/tasks.json`, criteria labels: `tasks/labels.json`.
3. Pin the product: `cd <REPO> && git archive a3c469de9c8a149079e9f46c9820b56e7329db14 | tar -x -C <somewhere>` (the bench does this
   itself through `ours.sh`). Rival arms: `bash bench/head-to-head/fetch-arms.sh` (pinned commits in `arms.json`).
4. Sessions: `drive.sh <WORK> <path of tasks/heldout> <dir holding tasks.json and labels.json> a3c469de9c8a149079e9f46c9820b56e7329db14`
   (a copy of the driver used, with placeholders for local paths; `PE_BENCH_ONLY_ARMS` lists the 11 arms). To run through the Claude Agent
   SDK, put a `claude` wrapper on PATH that calls `claude_agent_sdk.query()` with the same CLI binary and writes the stream-json
   messages unchanged (we used a local shim; it is not part of this repository). Without it the same runner works with the plain CLI;
   that is a different run path, record it.
5. Grade: `grade3.sh <WORK> <prep dir>` (three votes, seeds 1 to 3, `grade.mjs --joint`). If your `claude` wrapper ignores piped stdin,
   use `grader-wrapper.sh` as `PE_BENCH_CLAUDE` (see SUMMARY, departure 1).
6. Rescore: copy the votes into `grades/vote-N/` and run `python3 -I score.py`.

What will differ on a rerun: model variance. Observed here: three runs of one cell differ by up to 2 outcome points (ce X1: 3, 2, 4 of 4;
ours X3: 3, 4, 4) and the three grader votes agreed on every cell that decided Rule A and Rule B (the single failed criterion of
`ours`, X3 run 1 criterion 1, failed in all three votes). An F6 agreement figure was not measured in this round (F6 was not run).
