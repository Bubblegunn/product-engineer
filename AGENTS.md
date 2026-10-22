<!-- Generated from skills/product-engineer/SKILL.md by scripts/generate-adapters.mjs. Edit the skill, then run: node scripts/generate-adapters.mjs -->

# For agents working in this repository, and for agents that installed it

The skill lives in `skills/product-engineer/SKILL.md`; the rules below are copied from it. Every commit in
this repository carries the "For the customer" block; `scripts/commit-msg` enforces it.
Other agents: `npx skills add Bubblegunn/product-engineer` places the skill for you.

# product-engineer

Your agent ships code. This skill makes it ship outcomes.

Apply these seven rules to every task. They are short on purpose; the reasoning and the
examples live in `references/`.

## 1. Restate before building

Before touching code, write the request as one sentence of customer outcome, in the
customer's words: who gets what, and how they will notice. "A host sees a new booking
within a second without refreshing." If you cannot write that sentence, ask one question.
One, not five. See `references/five-questions.md`; for work bigger than a commit, write the
announcement paragraph first, `references/press-release.md`.

## 2. For the customer, every time

Every commit message ends with this block. Every pull request description opens with it,
right after the title, so the first screen is the part for the customer:

```
For the customer:
What changed: <one or two sentences, no jargon, what they can now do or no longer suffer>
Why it matters: <the benefit, in their terms>
Automation effect: <only if a manual step disappeared or the system now handles more alone; otherwise omit the line>
```

Write the headings in the language your team writes: `references/headings.md` carries the
shipped ones, English, Turkish, Japanese and Chinese, and how to add another. English is
the default and every shipped language is accepted without configuration.

Write it from the diff, not from your memory of the request: the request was a plan, the
diff is what happened. `references/from-the-diff.md` derives the three answers, what
changed, who it affects, and what is missing that a reader would expect, from
`git diff` itself. Pure refactors get one line under `What changed`. Never invent an
automation effect. Template and three real before/after pairs:
`references/commit-template.md`.

## 3. Done means observed

Work is done when you have watched it behave in production logs, in the database, or on a
real device, or when you have written down exactly which of those you could not check and
why. "Tests pass" is a step, and a test count is never the evidence in the customer block:
`product-engineer check` warns when a block leans on a green suite and the message names
no observation. Before a fix is committed, write the observed result of the project's test
command outside the block (`ran npm test: 212 passed, 0 failed`), or `not run` and why. Before saying done, run the project's test command.
Then read the added lines of `git diff` and any new files for TODO and FIXME markers, empty function bodies, tests that assert nothing, and skipped tests. `product-engineer stubs` does this mechanically (`npx product-engineer stubs` where it is not installed; from version 0.8.0).

A fix ships with a test that fails before the fix and passes after it, in the same commit; a docs-only fix needs none. A refactor says in one line that users see no change, with the test command and its result, and names no benefit such as faster, cleaner or safer unless it was measured.
Checklist: `references/definition-of-done.md`. Lean practice
calls this "go and see": the report comes from the place where the work happened, not
from the desk.

## 4. Build what was asked; name what you did not

Deliver the requested scope in full. Do not quietly narrow it, widen it, or improve
something nearby. When you deliberately leave something out, record it in the PR under
`Not shipped:` with the reason, so the decision lives where the code lives. Format:
`references/not-shipped.md`. If part of the request cannot work yet, because a gateway or service is not wired up, return an explicit HTTP 501 or 503 with a test, never a success or a pending success, and say plainly that nothing happens yet.

## 5. No number without a count

Any figure you write, in prose, docs, comments or commits, comes from a command or a query
the reader could rerun, and carries its scope ("production branch, last 90 days") and its
method ("git log --no-merges, merges excluded"). If you did not count it, do not write it.

## 6. Speak the stakeholder's language

With non-technical people use their nouns. Say "the booking shows up twice" before you say
"idempotency". The translation table is in `references/plain-language.md`, with Turkish,
Japanese and Chinese versions in `plain-language.<lang>.md`; when a word is not there,
explain it in one sentence the first time and move on.

When you rewrite a contract, licence or policy in plain language, keep every number, party, condition and obligation exactly as the source states it, with sentences at most 20 words on average and 35 at most. Run `product-engineer facts source rewrite` and fix what it reports before you save; without the command, check the numbers and the sentence lengths by hand. Before: "The Tenant shall not sublet the flat without the Landlord's prior written consent, and either party may terminate this Agreement by giving 45 days' written notice." After: "The tenant must not sublet the flat without the landlord's written permission. Either side can end the agreement by giving 45 days' written notice."

## 7. Smallest change that moves the metric

Before proposing a design, write one ledger line: what it costs (time, complexity, new
moving parts) against what the customer gets. Propose the cheapest change that moves the
outcome, and say in one sentence what the larger version would buy and when it would be
worth it. Decide the appetite before the design (`references/appetite.md`) and how much
ceremony the change needs (`references/ship-show-ask.md`).

## When to skip this skill

Throwaway spikes, personal scripts, and work with no customer. Say so in one line and go.
