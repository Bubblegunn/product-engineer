<p align="center"><img src="assets/wordmark.svg" width="520" alt="product-engineer"></p>

<p align="center">English | <a href="README.tr.md">Türkçe</a></p>

<p align="center"><em>Your agent ships code. product-engineer makes it ship outcomes.</em></p>

<p align="center">
  <img src="https://img.shields.io/github/stars/Bubblegunn/product-engineer?style=flat-square&color=111111" alt="stars">
  <img src="https://img.shields.io/badge/works%20with-21%20agents-111111?style=flat-square" alt="works with 21 agents">
  <img src="https://img.shields.io/github/actions/workflow/status/Bubblegunn/product-engineer/ci.yml?style=flat-square&color=111111&label=ci" alt="ci">
  <img src="https://img.shields.io/badge/license-MIT-111111?style=flat-square" alt="MIT">
</p>

An agent skill that makes an AI coding agent think like a product engineer instead of a
code printer. Before building, it restates the work as a customer outcome. In every commit
and pull request, it writes a plain-language "For the customer" block. It refuses to call
unobserved work done, names what it deliberately did not build, and never prints a number
it did not count.

## 30-second install

```
npx skills add Bubblegunn/product-engineer
```

That is the [skills.sh](https://skills.sh) installer. It detects the agents in the current
project and places the skill for each; `--all` targets every supported agent, `-g` installs
for your user instead of the project.

### Where it lands

| agent | path after `npx skills add` |
|---|---|
| Claude Code | `.claude/skills/product-engineer/` |
| Codex, Cursor, Copilot, Gemini CLI and other agents that read the shared skills directory | `.agents/skills/product-engineer/` |
| Windsurf, Roo, Kiro, Trae, Goose and others with their own directory | `.<agent>/skills/product-engineer/` |

Verified on 5 September 2026 with `npx skills add Bubblegunn/product-engineer --all --copy`
in an empty repository: one skill found, placed for 56 agent directories.

Claude Code, as a plugin (these two commands were run and verified; `claude plugin validate .`
passes):

```
/plugin marketplace add Bubblegunn/product-engineer
/plugin install product-engineer@bubblegunn
```

By hand: copy `skills/product-engineer/` into `.claude/skills/`, `.agents/skills/`, or your
agent's skills directory. Optional git hook that stops commits without the block:
`sh scripts/install-hook.sh`.

## Before and after

Before:

```
fix(notifications): classify IsSystem events as idempotent and skip the badge increment
```

After:

```
fix(notifications): classify IsSystem events as idempotent and skip the badge increment

For the customer:
What changed: Things the system handles on its own no longer light up the phone or the menu badge; only items that need a person do.
Why it matters: The badge count means "something needs you" again, so people stop ignoring it.
Automation effect: Automatic housekeeping events are now fully handled without anyone looking at them.
```

Before, the agent reports:

```
Done. All 42 tests pass.
```

After:

```
Watched it in staging logs: 3 of 3 webhook retries logged, final failure recorded with the booking id.
Could not check: production, no deploy yet.
Not shipped:
- Dead-letter queue: three retries cover every failure in 90 days of logs.
```

## Measured

Eight small tasks, each run twice with Claude Code in headless mode: once bare, once with
this skill installed in the repository. One run each, so a smoke test, not a study. The
harness, the fixtures and every transcript are in [`evals/`](evals/), and
[`evals/RESULTS.md`](evals/RESULTS.md) explains the heuristics and what they miss.

| metric | bare | skill |
|---|---|---|
| Commit carries the For-the-customer block | 0 / 8 | 8 / 8 |
| Final message reports an observation or says what it could not check | 1 / 8 | 7 / 8 |
| Final message names something deliberately not done | 2 / 8 | 7 / 8 |
| Every number has a method or scope next to it | 3 / 8 | 2 / 8 |
| Only the requested files changed | 5 / 8 | 4 / 8 |

The last two did not move, or moved against the skill, and are printed anyway: the number
heuristic trips on quoted code, and every scope miss in both conditions was the agent
documenting its change in README.md. The skill runs took about 60% more turns and cost about 45% more,
because they verified more and wrote more.

A real pair from the notification task, both commit messages unedited apart from the
trailer. Bare:

```
Show count of notifications needing a person on the bell

Add countNeedsPerson() and render it as a badge on the bell, hidden when
the count is zero.

The data has no "handled" flag, so the count treats `read` as the proxy
for handled: an item counts only when needsPerson is true and read is
false. That makes "Invoice 88 paid" (needsPerson, already read) drop out
of the badge.
```

With the skill:

```
feat(notifications): show a count on the bell for items awaiting a person

Count items flagged as needing a person that nobody has read yet. Items the
system handled on its own, and items already read, are excluded. The badge is
hidden entirely at zero so the number always means "something needs you".

For the customer:
What changed: The bell in the menu now carries a number showing how many notifications are still waiting for someone at the desk to act. When nothing is waiting, there is no number at all.
Why it matters: Front desk staff can see at a glance whether anything needs them, instead of opening the list to find out.

Assumption to confirm: a notification stops counting once someone has read it.
In the sample data this excludes "Invoice 88 paid", which is flagged as needing
a person but already read. If reading is not what marks an item handled, the
rule is one line in countNeedsAction.

Not shipped:
- Styling for the count: this repo has no stylesheet, so the number renders as plain text next to "Bell"; worth doing alongside whoever owns the menu's CSS.
- A "99+" cap for large counts: no evidence of how high real counts go; worth it once the number is wide enough to break the menu layout.
- Marking items read from the bell: not asked for, and it needs a decision on where notification state lives.
```

## Check a message or a pull request

`product-engineer check` reads a commit message or PR description and reports whether it
carries the block and whether the block reads the way the skill asks: `What changed`, `Why it
matters`, an `Automation effect` line that is either meaningful or absent, a well-formed
`Not shipped:` list, numbers without a method next to them, and jargon from the plain-language
table used without an explanation.

```
node bin/check.mjs check .git/COMMIT_EDITMSG     # or: product-engineer check <file|->
node bin/check.mjs check --pr 12                 # fetches the body with gh
```

```
ok    "For the customer:" block with "What changed:"
ok    "Why it matters:" present
ok    "Automation effect:" present
ok    "Not shipped:" lists 1 item with reasons
no errors, 0 warnings
```

Exit 1 on a missing block, 0 with `--warn`. Run on this repository's own last five commits
it reports no errors and one warning (a sentence quoting the eval counts without a method
word next to it).

## Use it in CI

```yaml
name: customer block
on: [pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: Bubblegunn/product-engineer@v0.2.0
        # with: { warn: "true" }   # report instead of failing
```

The action fails the pull request when its description has no "For the customer" block and
prints the other findings as warnings. Nothing is posted to the PR; the check log is the
report.

## The seven rules

1. **Restate before building.** One sentence of customer outcome, or one question.
2. **For the customer, every time.** What changed, why it matters, automation effect only if real.
3. **Done means observed.** Logs, data or a real device, or say what you could not check.
4. **Build what was asked; name what you did not.** A `Not shipped:` list with reasons.
5. **No number without a count.** Every figure has a command behind it and a scope.
6. **Speak the stakeholder's language.** A jargon-to-plain table ships with the skill.
7. **Smallest change that moves the metric.** One ledger line before any design.

Full text: [`skills/product-engineer/SKILL.md`](skills/product-engineer/SKILL.md). The
template, the five questions, the done checklist, the plain-language table and the
not-shipped format are in [`references/`](skills/product-engineer/references/).

## What it does not do

It runs no process and owns no workflow; it composes with spec, TDD and review skills. It
does not write product strategy. It enforces nothing unless you install the hook.

## Where it comes from

These are the rules Efe Genc worked by for four years as a founding engineer on a
hospitality platform and as the sole author of a proactive assistant: a commit convention
that explains every change to a non-technical reader, a definition of done that means
watching the thing behave, and the habit of writing down what was deliberately not built
([The feature I chose not to ship](https://efe-genc-portfolio.vercel.app/writing/the-feature-i-chose-not-to-ship/)).

## Contributing

Rule changes need one before/after pair; see [CONTRIBUTING.md](CONTRIBUTING.md). The
[roadmap](ROADMAP.md) is short on purpose. Translations and per-stack jargon tables are
labelled `good first issue`.

## Stars

<a href="https://star-history.com/#Bubblegunn/product-engineer&Date"><img src="https://api.star-history.com/svg?repos=Bubblegunn/product-engineer&type=Date" width="520" alt="Star history"></a>

MIT.
