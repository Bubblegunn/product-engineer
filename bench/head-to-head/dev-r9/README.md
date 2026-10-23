# dev-r9 development set

This is the development set for the r9 gate (docs/DEV-GATE-r9.md, section 1): six tasks DV1 to DV6, written by the controller, who knows the product.
Directories X91 to X96 map to DV1 to DV6. Each fixture.sh builds its repository from fragments, so no secret-shaped literal sits in this tree.
The criteria were written by an author who knows the traps, so a pass on this set does not show generalisation.
It is never a held-out set: held-out sets come from an external author, on their own branch, and are not built or read here.
heldout-prep.mjs is run on this directory only for its counts (6 tasks, 30 criteria, 24 outcome).
Each task has four outcome criteria and one process criterion, as heldout-prep requires.
Every fixture is deterministic: fixed dates, local identity Dev and dev@example.com, offline, Node only.
Tag v1.4.0 marks the start of the release range in X94 and X95.
Nothing in this set has been run; the orchestrator freezes it before the first run.
