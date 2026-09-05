<p align="center"><img src="assets/wordmark.svg" width="520" alt="product-engineer"></p>

<p align="center"><em>Your agent ships code. product-engineer makes it ship outcomes.</em></p>

<p align="center">
  <img src="https://img.shields.io/github/stars/Bubblegunn/product-engineer?style=flat-square&color=111111" alt="stars">
  <img src="https://img.shields.io/badge/works%20with-21%20agents-111111?style=flat-square" alt="works with 21 agents">
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

Claude Code:

```
/plugin marketplace add Bubblegunn/product-engineer
/plugin install product-engineer@bubblegunn
```

By hand: copy `skills/product-engineer/` into `.claude/skills/`, `.cursor/rules/`, or your
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

MIT.
