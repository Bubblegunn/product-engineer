# Experimental skills

A skill lands here when it does not yet have an eval task that measures what it claims.

`skills/*/SKILL.md` is the pack. Each of those declares `metadata.measuredBy`, naming metrics in
`evals/score.mjs` that score the behaviour it asks for, and `test/skill-structure.sh` fails when a
skill in the pack names a metric that does not exist or names none at all. That is the gate: a new
skill cannot join the pack by being added to the directory.

A skill here is still installed. `npx skills add` walks the repository to a depth of five and skips
only `node_modules`, `.git`, `dist`, `build` and `__pycache__` (read from `skills@1.5.23`), so a
dotted directory does not hide anything from it. The marker that travels with the file is the
description, which is why a skill here must open its description with `Experimental:`. An agent that
loads it then knows what it is holding, which a directory name alone would never tell it.

To move one into the pack: add a task under `evals/tasks/` that exercises it, run the eval, put the
result in `evals/RESULTS.md`, then move the directory up and declare `measuredBy`.
