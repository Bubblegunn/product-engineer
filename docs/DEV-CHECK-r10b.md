# Development check r10b (read material only; protocol written 2026-10-24 before the run)

Product under test: commit `e2d14b4` (verification loop, tool steering, second eye, brief, notes traceability). Material: the 12 gate-1 tasks (X11 to X34) and set d (X1 to X5), both read since r10. Ours is re-run (3 runs per task, fresh fixtures); base and rival cells are the ones already run with the same CLI, model and path (gate 1 and r9), regraded together with the new ours cells by five reason-first votes, close splits re-asked (seeds 6, 7).
This is a development check, not a gate: the tasks are read, so a pass is a signal that the mechanisms work, not evidence of generalisation.
Questions and rules, fixed here:
1. Is ours clearly ahead on the 12 gate-1 tasks? Yes if the lower bound of the 95% bootstrap interval of (ours minus the best other arm) per paired cell is above 0.
2. Cost: mean cost per cell of ours (session `total_cost_usd` plus the second-eye calls logged under the temp directory) divided by base's. If above 1.5, the second eye is switched off by default before any gate.
3. Did the mechanisms fire? Count Stop blocks (claim-gate output in the transcripts) and second-eye calls per arm of cells; report.
If question 1 is yes and question 2 passes: write the multi-writer gate with three NEW writers and run it. If not: diagnose the cells (which finding fired, which was useful, which was noise) and iterate on the mechanisms, then re-check on the same read material once more at most.
