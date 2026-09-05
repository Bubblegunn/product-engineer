# A deterministic baseline for message-code inconsistency

Date: 2026-09-05. Status: written before implementation, implemented from this document.
Predecessor: `2026-09-05-product-engineer-v2-design.md`.

## Goal

`check --diff` fires only when it can prove a mismatch between a commit message and the
change it describes. Nobody has published what that costs and what it buys. This measures
it: how often the checker is wrong about a message that was fine, and how much of a known
taxonomy of inconsistency it can catch at all.

The number that matters is specificity, because a checker that cries wolf on correct
messages is worse than no checker. Recall is expected to be low and the design says why.

## What was verified, and the finding that changed the plan

CodeFuse-CommitEval is the benchmark this study was meant to run against. Zhang, Liu, Di
and Qian, *CodeFuse-CommitEval: Towards Benchmarking LLM's Power on Commit Message and
Code Change Inconsistency Detection*, arXiv:2511.19875, submitted 25 November 2025. Read
from the abstract page: six open-source models, average recall 85.95%, average precision
80.28%, average specificity 63.8%. Built on the ApacheCM dataset, with seven kinds of
inconsistent message synthesised by rule-guided mutation and two-fold validation.

**Its dataset cannot be obtained.** The repository is Apache-2.0 and carries the
generation and evaluation pipeline, but the data file
`data_synthesis/synthesized_data/eval_50k.jsonl` is a Git LFS pointer to an object of
280,641,409 bytes that is not on the server. Checked on 2026-09-05, three ways:

- the LFS batch API returns `{"code": 404, "message": "Object does not exist on the server"}`
  for the pointer's oid;
- `https://media.githubusercontent.com/media/.../eval_50k.jsonl` returns 404;
- the repository has no releases and no issues, so there is no alternate host and nobody
  has reported it.

So the ground truth is not free after all, and the honest consequence is that no number
here is comparable to theirs on the same samples. Their figures appear in this document
and in the results as published context, never as a same-data comparison. That distinction
has to survive into every sentence that quotes them.

The second reason their data would not have been enough on its own: their pipeline mutates
messages with a model. `data_synthesis/inconsistency_rules.py` defines seven rules whose
`format_prompt` builds an instruction for `llm_interface.py`. Regenerating their corpus
would cost model calls and would not reproduce their samples.

## What is measured instead

A corpus built from real commits in the repository the harness is run in, mutated
deterministically, with no model and no network.

**Negative samples (consistent).** Every commit in the sample, message and diff unchanged.
These produce the specificity number, and they are the reason this is worth running: they
are real messages written by real people about real changes, which is a harder test of
false alarms than anything synthetic.

**Positive samples (inconsistent).** Mutations applied mechanically to those same commits.
Five kinds are produced without a model. Four carry CodeFuse-CommitEval's own type names,
cited, so the rows can be read next to their paper; the fifth is ours and is labelled that
way:

| Type | Their name | How it is produced here |
|---|---|---|
| `file-path` | File Path Mismatch | a path named in the message is replaced with one that is in neither the change nor the repository |
| `operation` | Operation Type Mismatch | an operation verb in the message is swapped for its opposite, `added` for `removed` |
| `extra-tests` | Extra Feature Description | a sentence claiming tests were added is appended to a change that adds no test file |
| `extra-docs-only` | Extra Feature Description | a sentence claiming the change is documentation only is appended to a change that touches source |
| `file-count` | ours, not theirs | a sentence stating a file count that the change contradicts is appended |

**Four of these five are within reach of the checker, and the fifth is in the corpus
deliberately because it is not.** Mapping each check to what it reads:

- check 4 reads paths, so it catches `file-path`;
- checks 1 and 2 read claims about tests and about documentation-only changes, so they
  catch the two `extra-*` mutations, which are one narrow slice of Extra Feature
  Description rather than the whole type;
- check 3 reads a stated file count, so it catches `file-count`;
- **nothing reads operation verbs**, so `operation` is expected to score zero recall.

`operation` is in the corpus precisely because it will score zero. A blind spot that
appears in the results as a row of zeros is a blind spot the reader can see; one left out
of the corpus is one the write-up is hiding. The same reasoning applies to the three
CodeFuse-CommitEval types no mechanical mutation can produce at all: Function Name
Mismatch, Component Mismatch and Purpose Mismatch all require reading what the code means,
and Missing Feature Description requires knowing what the message should have said.
`check --diff` reads a numstat, which is file paths and line counts and nothing else. A
tool that reported these would be guessing, and not guessing is the whole design.

So the expected result has a shape before it has values: specificity near 100%, recall
near 100% on `file-path`, `extra-tests`, `extra-docs-only` and `file-count`, and zero on
`operation`. A single blended recall figure across the taxonomy would be meaningless, so
results are per type and no blended recall is reported.

## What a bad result means

If specificity is below 100% on real unmutated commits, that is a false alarm on a message
somebody actually wrote, and it is a bug in the checker rather than a fact about the
corpus. The fix goes in `bin/diff.mjs`, not in the write-up. This already happened once:
`check --diff` warned on its own commit because the message quoted the phrase
`documentation only` while describing the check, which is recorded in the changelog and
fixed by masking quoted spans.

That rule has one boundary, and it was found by hitting it. This commit's own message
first read "the documentation-only check matched", in bare prose, on a change that touches
source. The checker warned, correctly by its own lights: an unquoted claim phrase next to a
source change is exactly what it is built to find. The repository's convention is that a
named phrase goes in backticks or quotation marks, and the masking in `crossCheck`
implements that convention, so the message was breaking a rule the tool already enforces.
The message was fixed and the checker was not. The line between the two cases is whether
the phrase is ordinary English or a term of art: "a run left five files modified" and
"Cursor users can drop one file into their project" are sentences anybody might write and
were checker bugs, while a message that discusses this check by name is a message about the
tool, and widening the checker for every such message is a regress with no floor.

If recall on a mechanical type is below 100%, the mutation is producing something the
checker was never meant to catch, and either the mutation or the claim about that type is
wrong.

## Why this study and not the one already designed

`evals/BENCHMARK.md` designs a fifty-diff, two-rater study of whether the skill makes
messages truer and more useful. It is a better study than this one and it stays where it
is. It is the wrong one to run first: it costs about $143 and ten rater-hours, and it
produces a number about our own skill, judged by raters we recruit, against a corpus we
sample. This one costs a few seconds of compute, produces a number about a checker anyone
can rerun on their own repository, and sits next to a published benchmark other people
already cite. Cheap and externally anchored comes first.

## Shape of the implementation

- `evals/baseline/mutate.mjs` holds pure functions, one per mutation type, each taking a
  message and a parsed diff and returning a mutated message or `null` when the commit is
  not a candidate for that mutation. No model, no network and no randomness at all, so a
  rerun on the same history is a check rather than a fresh draw.
- `evals/baseline/run.mjs` reads the last N commits of the repository it is run in,
  builds the corpus, calls `crossCheck` from `bin/diff.mjs` directly rather than shelling
  out, and writes `evals/baseline/RESULTS.md`.
- `test/baseline.test.mjs` asserts that each mutation produces the inconsistency it claims to, each
  refuses a commit it cannot mutate, and the scoring arithmetic is right.
- CI reruns the harness on every push and fails on the claim rather than on the bytes. A
  byte-for-byte freshness check is what `bench/PRECISION.md` uses in the sibling repository
  and it cannot work here: the corpus is the last N commits of a moving history, so the
  commit that records the table is inside the next run's corpus and the file is stale the
  moment it is written. `--check` asserts what the README claims instead, which is that no
  real message draws a false alarm, every kind marked reachable is caught every time, and
  the kind marked unreachable is caught never.

`crossCheck` takes `(text, diff, { cwd })` and `readDiff` is the only part that shells out
to git, so the harness constructs the diff object itself from `git show --numstat` per
commit. That keeps the measured code path identical to the one users run.

One limitation this creates, stated in the results: check 4 asks whether a path named in
the message exists in the working tree, so it is evaluated against the repository at HEAD
rather than at each historical commit. A path that existed then and was deleted since
would be reported as broken. The mutation for `file-path` uses a path that never existed
in the repository, so it is unaffected, but the specificity measurement is not: a real
message naming a since-deleted file will produce a false alarm that is an artifact of the
harness rather than of the checker. Any such case is reported separately rather than
folded into the specificity number.

## What this cannot show

Whether the checker helps anyone. It measures agreement between a message and a numstat on
a corpus of one repository's history, mutated by rules chosen because they are mechanical.
It says nothing about whether messages that pass are good, whether the warnings are read,
or whether the four detectable types are the ones that matter in practice. The published
model numbers it sits beside were measured on different data, by a different method, and
the two should never be put in the same table without that sentence attached.

## Measured result

Run on `product-engineer` at `25dcce7`, 200 commits deep, of which 64 carry file changes;
59 scored for specificity and 5 held out as harness artefacts, as the limits section above
requires. The commit is named because the corpus grows with the history, so these are the
figures of one run rather than a property of the tool.

| measure | value |
|---|---:|
| commits scored | 59 |
| false alarms | 0 |
| specificity | 100% |
| `file-path` recall | 100% (26 of 26) |
| `extra-tests` recall | 100% (30 of 30) |
| `extra-docs-only` recall | 100% (47 of 47) |
| `file-count` recall | 100% (56 of 56) |
| `operation` recall | 0% (0 of 4) |

The shape the design predicted, including the zero. `evals/baseline/RESULTS.md` carries the
same figures against the commit that produced them, and reruns from a clean checkout.

Three things the run changed, and they are the reason it was worth running.

**It found three false alarms on real commits**, which by this document's own rule are bugs
in the checker rather than facts about the corpus. All three were fixed in `bin/diff.mjs`.
A file count is only read as a claim when a change verb governs it: "a run left five files
modified" describes a previous run, and "Cursor users can drop one file into their project"
borrowed its verb from the "What changed:" heading. A planning artefact that describes tests
is no longer read as adding them. And a claim phrase inside a longer hyphenated identifier
is a name rather than an assertion: the type name `extra-docs-only`, written in a commit
message about this very corpus, was read as a claim that the change was documentation only.
That third one is the same use-mention confusion as the quoted-phrase bug recorded in the
changelog, which is worth noting: the class recurs, and each fix has been narrower than the
class. The cost of the file-count fix is that the passive "five files were changed" is no
longer checked, a miss rather than a false alarm, which is the direction this tool errs in.

**It corrected its own scoring.** The first run scored `operation` at 25% because one
mutated message tripped the path check on a file that had been moved since that commit,
which has nothing to do with the swapped verb. A mutation now counts as caught only when it
produces a warning the unmutated message did not, which is the difference between measuring
the mutation and measuring the corpus. That correction is why the row reads zero.

**It corrected the CI design.** The first version diffed the committed table against a fresh
run, which can never pass on a moving corpus. See the implementation section above.
