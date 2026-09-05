# Benchmark design

The eight-task smoke test in this directory shows a direction. This is the design for a
measurement someone else could repeat and argue with. Design only: nothing here has run.

## What is measured

Whether a commit message written with the skill is truer to its diff and more useful to a
non-engineer than one written without it, on real changes rather than on tasks this
repository wrote for itself.

## The diffs

Fifty diffs sampled from public commit-message datasets whose human-written messages
carry both a what and a why, restricted to repositories under permissive licences (MIT,
Apache-2.0, BSD) so the diffs can be redistributed with the results:

- CommitBench, https://github.com/Maxscha/commitbench (licence-filtered, deduplicated).
- CommitPackFT, https://huggingface.co/datasets/bigcode/commitpackft (permissive subset).
- CommitChronicle, https://huggingface.co/datasets/JetBrains-Research/commit-chronicle.

Sampling rule: diffs between 20 and 300 changed lines, one per repository, no generated or
vendored files, no merge commits, message body at least two sentences; a seeded shuffle
of the filtered pool, first fifty taken. The seed, the filter script and the fifty commit
hashes are published with the results.

## The two arms

Each diff is handed to the agent twice, in a clean checkout at the parent commit, with the
same prompt: "Write the commit message for this staged change." One arm has nothing
installed; the other has `skills/product-engineer/` in `.claude/skills/`. Three runs per
arm, so the interval in `score.mjs` has something to work with.

## Labelling

Two raters, blind to the arm, each see the diff and the two messages in a random order and
answer three yes/no questions per message: does it state what changed correctly, does it
state why, and could a non-engineer repeat it to a customer. Cohen's kappa is reported per
question; below 0.6 the question is rewritten and the labelling is repeated. The pairwise
model judge in `judge.mjs` runs on the same pairs and its agreement with the raters is
reported next to the kappa, so a reader can decide how much to trust it on its own.

## Cost

50 diffs x 2 arms x 3 runs at about $0.45 per run is $135 for the agent runs, plus 150 pairs
at about $0.05 per call for the model judge, about $8. The rater time is the larger cost:
150 pairs at roughly two minutes each is five hours per rater.

## What it still cannot show

Whether the block survives a real review process, whether the reader it was written for
actually reads it, and anything about tasks larger than one commit.
